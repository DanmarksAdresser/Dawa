"use strict";

const q = require('q');
const _ = require('underscore');

const importDarImpl = require('./importDarImpl');
const postgresMapper = require('./postgresMapper');
const proddb = require('../psql/proddb');
const scheduler = require('./scheduler');
const spec = require('./spec');
const logger = require('../logger').forCategory('darImport');

const darApiClient = require('./darApiClient')

function getRecordsForEntity(darClient, eventStart, eventSlut, entitet) {
  return q.async(function*() {
    let rows= [];
    let startindeks = null;
    let result;
    do {
      result = yield darClient.getRecordsPage(eventStart, eventSlut, entitet, startindeks);
      rows = rows.concat(result.records);
      startindeks = result.restindeks;
    }
    while(result.restindeks);
    return rows;
  })();
}

function getRows(darClient, currentEventIds, targetEventIds) {
  return q.async(function*() {
    const entities = Object.keys(targetEventIds);
    const result = {};
    for(let entity of entities) {
      const eventStart = currentEventIds[entity] + 1;
      const eventSlut = targetEventIds[entity];
      let rawResult;
      if(eventStart > eventSlut) {
        rawResult = [];
      }
      else {
        rawResult = yield getRecordsForEntity(darClient, eventStart, eventSlut, entity);
      }
      const normalizedResult = rawResult.map(row => {
        if(row.registreringtil) {
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


function splitInTransactions(rowMap) {
  function txTimestamp(row) {
    if(row.registreringtil) {
      return row.registreringtil;
    }
    else {
      return row.registreringfra;
    }
  }

  const uniqueTransactionTimestamps = _.uniq(_.flatten(_.values(rowMap)).map(txTimestamp)
    .sort((a, b) => Date.parse(a) - Date.parse(b)), true);

  return uniqueTransactionTimestamps.map(timestamp => {
    return _.mapObject(rowMap, rows => rows.filter(row => txTimestamp(row) === timestamp));
  });
}

function getCurrentEventIds(client) {
  return q.async(function*() {
    const selects = spec.entities.map(entity => `(SELECT GREATEST(MAX(eventopret), MAX(eventopdater), 0) FROM ${postgresMapper.tables[entity]}) as ${entity}`);
    const queryResult = yield client.queryp(`SELECT ${selects.join(', ')}`);
    const row = queryResult.rows[0];
    // fix the casing of result
    return spec.entities.reduce((memo, entity) => {
      memo[entity] = row[entity.toLowerCase()];
      return memo;
    }, {});
  })();
}

function fetchAndImport(client, darClient, remoteEventIds) {
  return q.async(function*() {
    const localEventIds = yield getCurrentEventIds(client);
    const rowsMap = yield getRows(darClient, localEventIds, remoteEventIds);
    const transactions = splitInTransactions(rowsMap);
    for(let transaction of transactions) {
      yield importDarImpl.withDar1Transaction(client, 'api', () => {
        return importDarImpl.importChangeset(client, transaction, false);
      });
    }
  })();
}

function importDaemon(baseUrl, pollIntervalMs) {
  const darClient = darApiClient.createClient(baseUrl);
  scheduler.schedule(pollIntervalMs, () => {
    return q.async(function*() {
      const remoteEventIds = yield darClient.getEventStatus();
      yield proddb.withTransaction('READ_WRITE', (client) => {
        return fetchAndImport(client, darClient, remoteEventIds);
      });
    })();
  }, error => logger.error('DAR1 API import failed', error));
}

module.exports = {
  importDaemon: importDaemon,
  internal: {
    getRecords: getRecordsForEntity,
    getCurrentEventIds: getCurrentEventIds,
    splitInTransactions: splitInTransactions,
    fetchAndImport: fetchAndImport
  }
};
