"use strict";

var request = require('request-promise');

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
exports.getPage = function(baseUrl, entityName, tsFrom, tsTo) {
  var url = baseUrl + apiPaths[entityName] +
    '?from=' + encodeURIComponent(tsFrom.toISOString()) +
    '&to=' + encodeURIComponent(tsTo.toISOString());
  console.log('Getting page ' + url);
  return request.get({url: url}).then(function(result) {
    return JSON.parse(result.trim());
  });
};

