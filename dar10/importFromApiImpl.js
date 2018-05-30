"use strict";

const q = require('q');
const _ = require('underscore');

const { go } = require('ts-csp');

const importDarImpl = require('./importDarImpl');
const dar10TableModels = require('./dar10TableModels');
const proddb = require('../psql/proddb');
const spec = require('./spec');
const logger = require('../logger').forCategory('darImport');
const moment = require('moment');

const darApiClient = require('./darApiClient');
const notificationClient = require('./notificationClient');

const { withImportTransaction } = require('../importUtil/importUtil');

function getRecordsForEntity(darClient, eventStart, eventSlut, entitet) {
  return q.async(function*() {
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
  return q.async(function*() {
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
  for(let row of allRows) {
    const ts = moment(txTimestamp(row));

    if(ts.isBefore(firstRegistrering)) {
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
    const lowercaseDarEntities = importDarImpl.ALL_DAR_ENTITIES.map(entityName => entityName.toLowerCase());
    return spec.entities.reduce((memo, entity) => {
      if(lowercaseDarEntities.includes(entity.toLowerCase()))  {
        memo[entity] = row[entity.toLowerCase()];
      }
      return memo;
    }, {});
  })();
}

function fetchAndImport(client, darClient, remoteEventIds, virkningTime, maxTransactions, multipleLocalTransactions) {
  return q.async(function*() {
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
      if(yield importDarImpl.hasChangedEntitiesDueToVirkningTime(client)) {
        logger.info('Has changed entities due to advancing virkning time');
        yield importDarImpl.withDar1Transaction(client, 'api', () =>
          withImportTransaction(client, 'importDarApi', (txid) =>
            importDarImpl.applyIncrementalDifferences(client, txid, false, [], virkningTime)));
      }
    }
    else {
      let transactionsToImport;
      if(multipleLocalTransactions) {
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
        yield importDarImpl.withDar1Transaction(client, 'api', () =>go(function*() {
          const before = Date.now();
          const result = yield withImportTransaction(client, 'importDarApi', (txid) => go(function*() {
            yield importDarImpl.importChangeset(client, txid, transaction, false, virkningTime);
            const after = Date.now();
            logger.info("Imported Transaction", {
              duration: after - before,
              txid,
              totalRowCount,
              delay: getImportDelay(transaction)
            });
          }));
          return result;
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
 * @param baseUrl
 * @param pollIntervalMs
 * @param notificationWsUrl
 * @returns {*}
 */
function importDaemon(baseUrl, pollIntervalMs, notificationWsUrl, pretend, noDaemon, importFuture, maxTransactions, multipleLocalTransactions) {

  return q.async(function*() {
    const darClient = darApiClient.createClient(baseUrl);
    const wsClient = notificationWsUrl ? notificationClient(notificationWsUrl) : null;
    if (!wsClient) {
      logger.info("Running DAR 1.0 import daemon without WebSocket listener");
    }
    let aborted = false;

    const doImport = () => {
      return q.async(function*() {
        const remoteEventIdList = yield darClient.getEventStatus();
        if (!Array.isArray(remoteEventIdList)) {
          logger.error('Got non-array response from DAR 1.0 status');
          return;
        }
        const remoteEventsIdMap = remoteEventIdList.reduce((memo, pair) => {
          memo[pair.entitet] = pair.eventid;
          return memo;
        }, {});
        return yield proddb.withTransaction('READ_WRITE', (client) => go(function*() {
          const virkningTime = importFuture ? moment().add(14, 'days').toISOString() : null;
          const result = yield fetchAndImport(client, darClient, remoteEventsIdMap, virkningTime, maxTransactions, multipleLocalTransactions);
          if(pretend) {
            throw new Error("Rolling back due to pretend param");
          }
          return result;
        }));
      })();
    };

    while (!aborted) {
      try {
        yield doImport();
        if(noDaemon) {
          break;
        }
      }
      catch (e) {
        logger.error('Error importing from DAR1.0', {error: e});
      }
      if(noDaemon) {
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

module.exports = {
  importDaemon,
  internal: {
    getRecords: getRecordsForEntity,
    getCurrentEventIds: getCurrentEventIds,
    splitInTransactions: splitInTransactions,
    fetchAndImport: fetchAndImport
  }
};
