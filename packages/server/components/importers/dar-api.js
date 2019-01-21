const _ = require('underscore');
const {go} = require('ts-csp');
const moment = require('moment');

const dar10TableModels = require('../../dar10/dar10TableModels');
const spec = require('../../dar10/spec');
const importUtil = require('@dawadk/import-util/src/postgres-streaming');
const tableDiffNg = require('@dawadk/import-util/src/table-diff');
const postgresMapper = require('../../dar10/postgresMapper');
const {
  ALL_DAR_ENTITIES,
  advanceVirkningTime,
  createFetchTable,
  copyEventIdsToFetchTable,
  setVirkningTime,
  hasChangedEntitiesDueToVirkningTime
} = require('../../dar10/import-dar-util');
const logger = require('@dawadk/common/src/logger').forCategory('darImport');


const txTimestamp = row => {
  if (row.registreringtil) {
    return row.registreringtil;
  }
  else if (row.registreringfra) {
    return row.registreringfra;
  }
  else if(row.registrering.upper) {
    return row.registrering.upper;
  }
  else {
    return row.registrering.lower;
  }
};

const getCurrentEventIds = (client, entities) => go(function* () {
  const selects = entities.map(entity => {
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
});


const getRemoteTxTimestamp = changeset => {
  let firstRegistrering = moment();
  const allRows = _.flatten(Object.values(changeset), true);
  for (let row of allRows) {
    const ts = moment(txTimestamp(row));
    if (ts.isBefore(firstRegistrering)) {
      firstRegistrering = ts;
    }
  }
  return firstRegistrering;
};

const getRecordsForEntity = (darClient, eventStart, eventSlut, entitet) => go(function* () {
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
});

const getRows = (darClient, localEventIds, remoteEventIds, entities) => go(function* () {
  const result = {};
  for (let entity of entities) {
    const rawResult = yield getRecordsForEntity(darClient, localEventIds[entity] + 1, remoteEventIds[entity], entity);
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
});

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
 * an insert or an update. Update virkningtime.
 */
function importChangeset(client, txid, changeset, overriddenVirkningTime) {
  changeset = mergeOpretUpdateRows(changeset);
  const entities = Object.keys(changeset);
  return go(function* () {
    if (Object.keys(changeset).length !== 0) {
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
  });
}

const fetchAndImport =
  (client, txid, context, darClient, remoteEventIds, overriddenVirkningTime) => go(function* () {
    context['dar-api'] = {};
    const localEventIds = yield getCurrentEventIds(client, Object.keys(remoteEventIds));
    const modifiedEntities = Object.keys(remoteEventIds).filter(entityName =>
      localEventIds[entityName] !== remoteEventIds[entityName]);
    const beforeApiFetchMillis = Date.now();
    const rowsMap = yield getRows(darClient, localEventIds, remoteEventIds, modifiedEntities);
    const afterApiFetchMillis = Date.now();
    const rowCounts = _.mapObject(rowsMap, row => row.length);
    const totalRowCount = Object.keys(rowCounts).reduce((memo, key) => memo + rowCounts[key], 0);
    logger.info('Fetched rows from DAR 1.0 API', {
      rowCount: totalRowCount,
      millis: afterApiFetchMillis - beforeApiFetchMillis
    });
    if (totalRowCount === 0) {
      if (hasChangedEntitiesDueToVirkningTime(client)) {
        yield importChangeset(client, txid, {}, overriddenVirkningTime);
      }
    }
    else {
      logger.info('Importing transaction', {
        totalRowCount,
        rowCounts
      });
      yield importChangeset(client, txid, rowsMap, overriddenVirkningTime);
      context['dar-api']['remote-tx-timestamp'] = getRemoteTxTimestamp(rowsMap);
      context['dar-api']['total-row-count'] = totalRowCount;
    }
  });

const createDarApiImporter = options => ({
  description: 'DAR API importer',
  executeIncrementally: (client, txid, context) => go(function* () {
    const {darClient, remoteEventIds, overriddenVirkningTime} = options;
    yield fetchAndImport(client, txid, context, darClient, remoteEventIds, overriddenVirkningTime);
  })
});

module.exports = {
  createDarApiImporter,
  internal: {
    fetchAndImport, getCurrentEventIds,importChangeset, getRecordsForEntity
  }
};