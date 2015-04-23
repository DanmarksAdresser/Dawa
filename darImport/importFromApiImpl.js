"use strict";

var moment = require('moment');
var request = require('request-promise');
var _ = require('underscore');

var importDarImpl = require('./importDarImpl');
var logger = require('../logger').forCategory('darImport');
var qUtil = require('../q-util');


/**
 * The maximum duration a BBR transaction may take. If any transaction is in progress,
 * we know that the data will be visible at most this duration later.
 */
var MAX_DAR_TX_DURATION = moment.duration(60, 'seconds');
/**
 * The maximum number of records DAR will return in one request. DAR guarantees that no transaction
 * will generate more than this number of records.
 */
var MAX_RETURNED_RECORDS = 10000;

function mergeResults(result, page) {
  var sorted = result.concat(page).sort(function(a, b) {
    if(a.versionid < b.versionid) {
      return -1;
    }
    if(a.versionid > b.versionid) {
      return 1;
    }
    // if two rows have same versionid, but one have registreringslut,
    // we want it to be first, such that it is the other which is removed.
    if(a.registeringslut === b.registeringslut) {
      return 0;
    }
    else if(a.registreringslut) {
      return -1;
    }
    else if(b.registreringslut) {
      return 1;
    }
    else {
      logger.error('Received two rows with same versionid, but different registreringslut', {
        a: a,
        b: b
      });
      return 0;
    }
  });
  return _.uniq(sorted, true, function(val) {
    return val.versionid;
  });
}

function getTimestamp(item) {
  if(item.registreringslut) {
    return moment(item.registreringSlut);
  }
  else {
    return moment(item.registreringStart);
  }
}

function allHasSameTimestamp(page) {
  if(page.length === 0) {
    return false;
  }
  var ts = getTimestamp(page[0]);
  return _.every(page, function(item) {
    return getTimestamp(item).isSame(ts);
  });
}

var apiPaths = {
  adgangspunkt: '/HentAdgangspunkt',
  husnummer: '/HentHusnummer',
  adresse: '/HentAdresse'
};

/**
 * Get a single page from API. Return array of records
 * @param baseUrl
 * @param entityName
 * @param tsFrom
 * @param tsTo
 */
function getPage(baseUrl, entityName, tsFrom, tsTo) {
  var url = baseUrl + apiPaths[entityName] +
    '?from=' + encodeURIComponent(tsFrom.toISOString()) +
    '&to=' + encodeURIComponent(tsTo.toISOString());
  console.log('Getting page ' + url);
  return request.get({url: url}).then(function(result) {
    return JSON.parse(result.trim());
  });
}

/**
 * Get all records with timestamp greater or equal to tsFrom.
 * Return an array of records ordered by versionid
 * @param baseUrl
 * @param entityName
 * @param tsFrom
 */
function getRecordsSince(baseUrl, entityName, tsFrom, tsTo) {
  return getPage(baseUrl, entityName, tsFrom, tsTo).then(function(page) {
    var result = page;
    return qUtil.awhile(
      function() { return page.length >= MAX_RETURNED_RECORDS; },
      function() {
        var maxPageTs = _.reduce(page, function(memo, item) {
          var ts = getTimestamp(item);
          if(memo.isBefore(ts)) {
            return ts;
          }
          else {
            return memo;
          }
        }, getTimestamp(page[0]));
        // DAR guarantees that at most 10K items will have same timestamp.
        // This is neccessary because we do paging using timestamps.
        // If more than 10K items have same timestamp, and we
        // can only get 10K items, then we cannot get them all.
        if(allHasSameTimestamp(page)) {
          logger.error('Received a page with 10000 items with equal timestamp.' +
          ' This will result in lost records.', {
            entityName: entityName,
            tsFrom: tsFrom,
            tsTo: tsTo
          });
          tsFrom = maxPageTs.add(moment.duration(1));
        }
        else {
          tsFrom = maxPageTs;
        }
        return getPage(baseUrl, entityName, tsFrom, tsTo).then(function(_page) {
          page = _page;
          result = mergeResults(result, page);
          return result;
        });
      })
      .then(function() {
        return result;
      });
  });
}

/**
 * Fetch each entity type from API.
 * @param baseUrl
 * @param tsFrom Fetch rows time timestamp >= this value
 * @param Fetch rows with timestamp less than or equal this value.
 * @returns A map, where key is the entity type and value is an array of rows fetched from the
 * API
 */
function fetch(baseUrl, tsFrom, tsTo) {
  return qUtil.reduce(['adgangspunkt', 'husnummer', 'adresse'], function(memo, entityName) {
    return getRecordsSince(baseUrl, entityName, tsFrom, tsTo).then(function(result) {
      memo[entityName] = result;
      return memo;
    });
  }, {});
}

/**
 * Repeatedly fetch all changed records from API, ontil two succeeding fetches gives the same result.
 * This is neccesary to ensure that we do not fetch a partial transaction from the API.
 * NOTE: Because of transactions in progress, additional records may appear later.
 * @param baseUrl
 * @param resultSet
 * @param tsFrom
 * @param tsTo
 * @returns {*}
 */
function fetchUntilStable(baseUrl, resultSet, tsFrom, tsTo, report) {
  function countResults(resultSet) {
    return Object.keys(resultSet).reduce(function(memo, entityName) {
      return memo + resultSet[entityName].length;
    }, 0);
  }
  if(!resultSet) {
    return fetch(baseUrl, tsFrom, tsTo).then(function(resultSet) {
      return fetchUntilStable(baseUrl, resultSet, tsFrom, tsTo, report);
    });
  }
  if(countResults(resultSet) === 0) {
    // no results, no need to check for changes
    return resultSet;
  }
  // If we get some results, we fetch again to ensure that we
  // did not receive a partial transaction
  return fetch(baseUrl, tsFrom, tsTo).then(function(secondResult) {
    if(countResults(resultSet) === countResults(secondResult)) {
      if(report) {
        report.fetchUntilStable = {
          adgangspunktCount: secondResult.adgangspunkt.length,
          husnummerCount: secondResult.husnummer.length,
          adresseCount: secondResult.adresse.length
        };
      }
      return secondResult;
    }
    else {
      return fetchUntilStable(baseUrl, secondResult, tsFrom, tsTo, report);
    }
  });
}

function getLastFetched(client) {
  return client.queryp('SELECT lastfetched FROM dar_lastfetched', []).then(function(result) {
    if(result.rows && result.rows[0] && result.rows[0].lastfetched) {
      return moment(result.rows[0].lastfetched);
    }
    return null;
  });
}

function setLastFetched(client, timestamp) {
  return client.queryp('UPDATE dar_lastfetched SET lastfetched = $1', [timestamp]);
}

function getLastSeenTs(client) {
  return client.queryp('SELECT GREATEST(' +
  '(SELECT max(coalesce(upper(registrering), lower(registrering))) from dar_adgangspunkt), ' +
  '(SELECT max(coalesce(upper(registrering), lower(registrering))) from dar_husnummer),' +
  '(SELECT max(coalesce(upper(registrering), lower(registrering))) from dar_adresse)) as lastseen',[]).then(function(result) {
    if(result.rows && result.rows.length > 0) {
      return moment(result.rows[0].lastseen);
    }
    return null;
  });
}

function importFromApi(client, url, report) {
  var tsFrom, tsTo;
  return getLastFetched(client)
    .then(function (lastFetched) {
      if (!lastFetched) {
        return getLastSeenTs(client);
      }
      else {
        return lastFetched;
      }
    })
    .then(function (lastFetchedTs) {
      if (!lastFetchedTs) {
        tsFrom = moment.unix(0);
      }
      else {
        tsFrom = lastFetchedTs;
      }
      tsTo = moment();
      return fetchUntilStable(url, null, tsFrom, tsTo, report);
    })
    .then(function (resultSet) {
      if (resultSet.adgangspunkt.length + resultSet.husnummer.length + resultSet.adresse.length === 0) {
        logger.info('No new records on API', {
          tsFrom: tsFrom.toISOString(),
          tsTo: tsTo.toISOString()
        });
        return;
      }
      else {
        return importDarImpl.applyDarChanges(client, resultSet, report);
      }
    }).then(function () {
      return setLastFetched(client, tsTo.subtract(MAX_DAR_TX_DURATION));
    });
}

exports.importFromApi = importFromApi;