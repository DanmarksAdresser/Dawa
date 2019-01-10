"use strict";

const q = require('q');
const _ = require('underscore');

const {go} = require('ts-csp');

const importDarImpl = require('./importDarImpl');
const dar10TableModels = require('./dar10TableModels');
const proddb = require('../psql/proddb');
const spec = require('./spec');
const logger = require('@dawadk/common/src/logger').forCategory('darImport');
const moment = require('moment');

const darApiClient = require('./darApiClient');
const notificationClient = require('./notificationClient');

const {withImportTransaction} = require('../importUtil/transaction-util');
const importUtil = require('@dawadk/import-util/src/postgres-streaming');
const tableDiffNg = require('@dawadk/import-util/src/table-diff');
const postgresMapper = require('./postgresMapper');
const {
  ALL_DAR_ENTITIES,
  advanceVirkningTime,
  createFetchTable,
  copyEventIdsToFetchTable,
  setVirkningTime,
  hasChangedEntitiesDueToVirkningTime
} = require('./import-dar-util');

function getRecordsForEntity(darClient, eventStart, eventSlut, entitet) {
  return q.async(function* () {
    let rows = [];
    let startindeks = null;
    let result;
    do {
      result = yield darClient.getRecordsPage(eventStart, eventSlut, entitet, startindeks);
      rows = rows.concat(result.records);
      startindeks = result.restindeks;
    }
    while (result.restindeks);
    return rows;
  })();
}

function getRows(darClient, currentEventIds, targetEventIds) {
  return q.async(function* () {
    const entities = Object.keys(targetEventIds);
    const result = {};
    for (let entity of entities) {
      const eventStart = currentEventIds[entity] + 1;
      const eventSlut = targetEventIds[entity];
      let rawResult;
      if (eventStart > eventSlut) {
        rawResult = [];
      }
      else {
        rawResult = yield getRecordsForEntity(darClient, eventStart, eventSlut, entity);
      }
      const normalizedResult = rawResult.map(row => {
        if (row.registreringtil) {
          row.eventopret = null;
          row.eventopdater = row.eventid;
        }
        else {
          row.eventopret = row.eventid;
          row.eventopdater = null;
        }
        delete row.eventid;
        return row;
      });
      result[entity] = normalizedResult;
    }
    return result;
  })();
}

function txTimestamp(row) {
  if (row.registreringtil) {
    return row.registreringtil;
  }
  else {
    return row.registreringfra;
  }
}

const getImportDelay = (changeset) => {
  let firstRegistrering = moment();
  const allRows = _.flatten(Object.values(changeset), true);
  for (let row of allRows) {
    const ts = moment(txTimestamp(row));

    if (ts.isBefore(firstRegistrering)) {
      firstRegistrering = ts;
    }
  }
  return moment().diff(firstRegistrering, 'seconds', true);
}

function splitInTransactions(rowMap) {

  const uniqueTransactionTimestamps = _.uniq(_.flatten(_.values(rowMap)).map(txTimestamp)
    .sort((a, b) => Date.parse(a) - Date.parse(b)), true);

  return uniqueTransactionTimestamps.map(timestamp => {
    return _.mapObject(rowMap, rows => rows.filter(row => txTimestamp(row) === timestamp));
  });
}

function getCurrentEventIds(client) {
  return q.async(function* () {
    const selects = spec.entities.map(entity => {
      const tableName = dar10TableModels.rawTableModels[entity].table;
      return `(SELECT coalesce(MAX(GREATEST(eventopret,eventopdater)), 0) FROM ${tableName}) as ${entity}`;
    });
    const queryResult = yield client.queryp(`SELECT ${selects.join(', ')}`);
    const row = queryResult.rows[0];
    // fix casing and filter
    const lowercaseDarEntities = ALL_DAR_ENTITIES.map(entityName => entityName.toLowerCase());
    return spec.entities.reduce((memo, entity) => {
      if (lowercaseDarEntities.includes(entity.toLowerCase())) {
        memo[entity] = row[entity.toLowerCase()];
      }
      return memo;
    }, {});
  })();
}

function fetchAndImport(client, darClient, remoteEventIds, overriddenVirkningTime, maxTransactions, multipleLocalTransactions) {
  return q.async(function* () {
    const localEventIds = yield getCurrentEventIds(client);
    const beforeApiFetchMillis = Date.now();
    const rowsMap = yield getRows(darClient, localEventIds, remoteEventIds);
    const afterApiFetchMillis = Date.now();
    const totalRowCount = Object.keys(rowsMap).reduce((memo, key) => memo + rowsMap[key].length, 0);
    logger.info('Fetched rows from DAR 1.0 API', {
      rowCount: totalRowCount,
      millis: afterApiFetchMillis - beforeApiFetchMillis
    });
    const transactions = splitInTransactions(rowsMap);
    if (transactions.length === 0) {
      if(hasChangedEntitiesDueToVirkningTime(client)) {
        yield withImportTransaction(client, 'importDarApi', (txid) => go(function* () {
          yield importChangeset(client, txid, {}, overriddenVirkningTime);
        }));
      }
    }
    else {
      let transactionsToImport;
      if (multipleLocalTransactions) {
        transactionsToImport = transactions.slice(0, Math.min(maxTransactions, transactions.length));
      }
      else {
        transactionsToImport = [rowsMap];
      }
      for (let transaction of transactionsToImport) {
        const rowCounts = _.mapObject(transaction, row => row.length);
        const totalRowCount = Object.keys(rowCounts).reduce((memo, key) => memo + rowCounts[key], 0);
        logger.info('Importing transaction', {
          totalRowCount,
          rowCounts
        });
        const before = Date.now();
        yield withImportTransaction(client, 'importDarApi', (txid) => go(function* () {
          yield importChangeset(client, txid, transaction, overriddenVirkningTime);
          const after = Date.now();
          logger.info("Imported Transaction", {
            duration: after - before,
            txid,
            totalRowCount,
            delay: getImportDelay(transaction)
          });
        }));
      }
    }
  })();
}

function race(promises) {
  return q.Promise((resolve, reject) => {
    let resolved = false;

    for (let promise of promises) {
      promise.then((value) => {
        if (!resolved) {
          resolved = true;
          resolve({value: value, promise: promise});
        }
      }, (error) => {
        if (!resolved) {
          resolved = true;
          reject({error: error, promise: promise});
        }
      })
    }
  });
}

/**
 * Start a persistent import daemon, which polls the DAR Status endpoint as well as
 * listen to WebSocket notifications. If pollIntervalMs passes or a websocket message is recevied,
 * we check the current Status using the DAR Status service and initiate an import if neccesary.
 * The service runs in a loop.
 */
function importDaemon(baseUrl, pollIntervalMs, notificationWsUrl,
                      pretend, noDaemon, importFuture,
                      maxTransactions, multipleLocalTransactions) {

  return q.async(function* () {
    const darClient = darApiClient.createClient(baseUrl);
    const wsClient = notificationWsUrl ? notificationClient(notificationWsUrl) : null;
    if (!wsClient) {
      logger.info("Running DAR 1.0 import daemon without WebSocket listener");
    }
    let aborted = false;

    const doImport = () => {
      return q.async(function* () {
        const remoteEventIdList = yield darClient.getEventStatus();
        if (!Array.isArray(remoteEventIdList)) {
          logger.error('Got non-array response from DAR 1.0 status');
          return;
        }
        const remoteEventsIdMap = remoteEventIdList.reduce((memo, pair) => {
          memo[pair.entitet] = pair.eventid;
          return memo;
        }, {});
        return yield proddb.withTransaction('READ_WRITE', (client) => go(function* () {
          const virkningTime = importFuture ? moment().add(14, 'days').toISOString() : null;
          const result = yield fetchAndImport(client, darClient, remoteEventsIdMap, virkningTime, maxTransactions, multipleLocalTransactions);
          if (pretend) {
            throw new Error("Rolling back due to pretend param");
          }
          return result;
        }));
      })();
    };

    while (!aborted) {
      try {
        yield doImport();
        if (noDaemon) {
          break;
        }
      }
      catch (e) {
        logger.error('Error importing from DAR1.0', {error: e});
        throw e;
      }
      if (noDaemon) {
        break;
      }
      try {
        const pollPromise = q.delay(pollIntervalMs);
        if (wsClient) {
          const notificationPromise = wsClient.await();
          yield race([pollPromise, notificationPromise]);
          wsClient.unawait();
        }
        else {
          yield pollPromise;
        }
      }
      catch (e) {
        logger.error('WebSocket error receiving DAR notifications', {error: e});
        yield q.delay(5000);
      }
    }
  })();
}

const storeChangesetInFetchTables = (client, changeset) => go(function* () {
  for (let entityName of Object.keys(changeset)) {
    const rows = changeset[entityName];
    const tableModel = dar10TableModels.rawTableModels[entityName];
    const targetTable = tableModel.table;
    const mappedRows = rows.map(postgresMapper.createMapper(entityName, true));
    const fetchedTable = `fetch_${targetTable}`;
    const columns = dar10TableModels.rawTableModels[entityName].columns.map(column => column.name);
    yield createFetchTable(client, targetTable);
    yield importUtil.streamArrayToTable(client, mappedRows, fetchedTable, columns);
    yield copyEventIdsToFetchTable(client, fetchedTable, targetTable);
  }
});

const mergeOpretUpdateRows = changeset => {
  const newChangeset = {};
  for (let [entity, rows] of Object.entries(changeset)) {
    const grouped = _.groupBy(rows, 'rowkey');
    const result = Object.values(grouped).map(([firstRow, secondRow]) => {
      if (!secondRow) {
        return firstRow;
      }
      else if (secondRow.eventopdater) {
        return Object.assign({}, secondRow, {eventopret: firstRow.eventopret});
      }
      else {
        return Object.assign({}, firstRow, {eventopret: secondRow.eventopret});
      }
    });
    newChangeset[entity] = result;
  }
  return newChangeset;
};

/**
 * Import a collection of records to the database. Each record either represents
 * an insert or an update.
 */
function importChangeset(client, txid, changeset, overriddenVirkningTime) {
  changeset = mergeOpretUpdateRows(changeset);
  const entities = Object.keys(changeset);
  return go(function* () {
    if(Object.keys(changeset).length !== 0) {
      yield storeChangesetInFetchTables(client, changeset);
      for (let entity of entities) {
        const tableModel = dar10TableModels.rawTableModels[entity];
        const fetchTable = `fetch_${tableModel.table}`;
        const dirtyTable = `dirty${tableModel.table}`;
        yield client.queryp(`CREATE TEMP TABLE ${dirtyTable} AS (SELECT rowkey FROM ${fetchTable})`);
        yield tableDiffNg.computeDifferencesSubset(client, txid, fetchTable, dirtyTable, tableModel);
        yield tableDiffNg.applyChanges(client, txid, dar10TableModels.rawTableModels[entity]);
        yield importUtil.dropTable(client, dirtyTable);
        yield importUtil.dropTable(client, fetchTable);
      }
    }
    if (overriddenVirkningTime) {
      yield setVirkningTime(client, overriddenVirkningTime);
    }
    else {
      yield advanceVirkningTime(client, txid, ALL_DAR_ENTITIES);
    }
    yield importDarImpl.propagateIncrementalChanges(client, txid);
  });
}

module.exports = {
  importDaemon,
  importChangeset,
  internal: {
    getRecords: getRecordsForEntity,
    getCurrentEventIds,
    splitInTransactions,
    fetchAndImport
  }
};
