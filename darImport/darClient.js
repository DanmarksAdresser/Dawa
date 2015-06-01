"use strict";

var moment = require('moment');
var request = require('request-promise');

var logger = require('../logger').forCategory('darImport');

var apiPaths = {
  adgangspunkt: '/HentAdgangspunkt',
  husnummer: '/HentHusnummer',
  adresse: '/HentAdresse'
};

/**
 * Get a single page from API. Return array of records.
 * @param baseUrl
 * @param entityName 'adgangspunkt', 'husnummer' eller 'adresse'
 * @param tsFrom moment timestamp
 * @param tsTo moment timestamp
 */
exports.getPage = function(baseUrl, entityName, tsFrom, tsTo, report) {
  var url = baseUrl + apiPaths[entityName] +
    '?from=' + encodeURIComponent(tsFrom.toISOString()) +
    '&to=' + encodeURIComponent(tsTo.toISOString());
  logger.debug('Getting page ' + url);
  var before = moment();
  return request.get({url: url}).then(function(result) {
    var parsedResult = JSON.parse(result.trim());
    var after = moment();
    if(report) {
      report.fetches = report.fetches || {};
      report.fetches[entityName] = report.fetches[entityName] || {};
      report.fetches[entityName][before.toISOString() + ' ' + after.toISOString()] = parsedResult;
    }
    return parsedResult;
  });
};

