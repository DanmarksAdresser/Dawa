"use strict";

var q = require('q');
const { go } = require('ts-csp');
var _ = require('underscore');

var columnMappings = require('../../apiSpecification/replikering/columnMappings');
var csvParse = require('csv-parse');
var resourceImpl = require('../../apiSpecification/common/resourceImpl');

function getResponse(dbClient, resourceSpec, pathParams, queryParams) {
  return resourceImpl.materializeResponse(dbClient, resourceSpec, 'http://dawa', pathParams, queryParams);
}

// Get the response of a resource as a string
exports.getStringResponse = (dbClient, resourceSpec, pathParams, queryParams) => go(function*() {
  const res = yield getResponse(dbClient, resourceSpec, pathParams, queryParams);
  if(res.status !== 200) {
    throw new Error('Unexpected status code: ' + res.status);
  }
  return res.body;
});

// Get the response of a resource as JSON
exports.getJson = (dbClient, resourceSpec, pathParams, queryParams) => go(function*() {
  const str = yield exports.getStringResponse(dbClient, resourceSpec, pathParams, queryParams);
  return JSON.parse(str);
});

// get the response of a resource and parse as CSV
exports.getCsv = (dbClient, resourceSpec, pathParams, queryParams) => go(function*() {
  queryParams.format = 'csv';
  const str = yield exports.getStringResponse(dbClient, resourceSpec, pathParams, queryParams);
  return yield q.nfcall(csvParse, str, {columns: true});
});

function jsFieldToCsv(field) {
  if (typeof field === 'string') {
    return field;
  } else if (typeof field === 'number') {
    return '' + field;
  } else if (typeof field === 'boolean') {
    return field ? '1' : '';
  } else if (field instanceof Date) {
    return '' + field.getTime();
  }
  else {
    return '';
  }
}

// Convert a JavaScript array to an array of CSV field values
exports.jsToCsv = function(obj) {
  return _.reduce(obj, function(memo, field, fieldName) {
    memo[fieldName] = jsFieldToCsv(field);
    return memo;
  },{});
};


exports.toSqlModel = function(datamodelName, apiObject) {
  return _.reduce(columnMappings.columnMappings[datamodelName], function (memo, mapping) {
    var sqlColumn = mapping.column || mapping.name;
    memo[sqlColumn] = apiObject[mapping.name];
    return memo;
  }, {});
};

exports.getResponse = getResponse;

exports.ait = (text, generator) => {
  it(text, q.async(generator));
};
