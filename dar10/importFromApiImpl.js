"use strict";

const url = require('url');
const request = require('request-promise');
const q = require('q');
const _ = require('underscore');

const importDarImpl = require('./importDarImpl');
const postgresMapper = require('./postgresMapper');
const proddb = require('../psql/proddb');
const scheduler = require('./scheduler');
const spec = require('./spec');
const logger = require('../logger').forCategory('darImport');

function getEventStatus(baseUrl) {
  return q.async(function*() {
    const statusUrl = baseUrl + '/Status'
    return yield request.get({uri: statusUrl, json: true});
  })();
}

function recordsUrl(baseUrl, eventStart, eventSlut, entitet, startindeks) {
  const parsedUrl = url.parse(baseUrl +  '/Records', true);
  parsedUrl.query.Eventstart = eventStart;
  parsedUrl.query.Eventslut = eventSlut;
  parsedUrl.query.Entitet = entitet;
  if(startindeks) {
    parsedUrl.query.Startindeks=startindeks;
  }
  return url.format(parsedUrl);
}

function getRecordsPage(baseUrl, eventStart, eventSlut, entitet, startindeks) {
  const queryUrl = recordsUrl(baseUrl, eventStart, eventSlut, entitet, startindeks);
  return request.get({
    uri: queryUrl,
    json: true
  });
}


function getRecordsForEntity(baseUrl, eventStart, eventSlut, entitet) {
  return q.async(function*() {
    let rows= [];
    let startindeks = null;
    let result;
    do {
      result = yield getRecordsPage(baseUrl, eventStart, eventSlut, entitet, startindeks);
      rows = rows.concat(result.records);
      startindeks = result.restindeks;
    }
    while(result.restindeks);
    return rows;
  })();
}

function getRows(baseUrl, currentEventIds, targetEventIds) {
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
        rawResult = getRecordsForEntity(baseUrl, eventStart, eventSlut, entity);
      }
      // TODO: We need to validate according to correct schema
      result[entity] = rawResult.map(postgresMapper.createMapper(entity, false));
    }
    return result;
  })();
}


function splitInTransactions(rowMap) {
  function txTimestamp(row) {
    if(row.registrering.upperInfinite) {
      return row.registrering.lower;
    }
    else {
      return row.registrering.upper;
    }
  }

  // TODO: We probably need to parse the timestamps appropriately
  const uniqueTransactionTimestamps = _.uniq(_.flatten(_.values(rowMap)).map(txTimestamp).sort(), true);
  console.log(uniqueTransactionTimestamps);

  return uniqueTransactionTimestamps.map(timestamp => {
    return _.mapObject(rowMap, rows => rows.filter(row => txTimestamp(row) === timestamp));
  });
}

function getCurrentEventIds(client) {
  return q.async(function*() {
    const selects = spec.entities.map(entity => `(SELECT GREATEST(MAX(eventopret), MAX(eventopdater), 0) FROM ${postgresMapper.tables[entity]}) as ${entity}`);
    const queryResult = yield client.queryp(`SELECT ${selects.join(', ')}`);
    return queryResult.rows[0];
  })();
}

function importDaemon(baseUrl, pollIntervalMs) {
  scheduler.schedule(pollIntervalMs, () => {
    return q.async(function*() {
      const remoteEventIds = yield getEventStatus(baseUrl);
      yield proddb.withTransaction('READ_WRITE', q.async(function*(client) {
        const localEventIds = yield getCurrentEventIds(client);
        const rowsMap = yield getRows(baseUrl, localEventIds, remoteEventIds);
        const transactions = splitInTransactions(rowsMap);
        for(let transaction of transactions) {
          yield importDarImpl.withDar1Transaction(client, 'api', () => {
            return importDarImpl.importChangeset(client, transaction, false);
          });
        }
      }));
    })();
  }, error => logger.error('DAR1 API import failed', error));
}

module.exports = {
  importDaemon: importDaemon,
  internal: {
    getRecords: getRecordsForEntity,
    recordsUrl: recordsUrl,
    getCurrentEventIds: getCurrentEventIds,
    splitInTransactions: splitInTransactions
  }
};
