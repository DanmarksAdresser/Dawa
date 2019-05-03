"use strict";

var q = require('q');
const { go } = require('ts-csp');
var _ = require('underscore');

var csvParse = require('csv-parse');
var resourceImpl = require('../../apiSpecification/common/resourceImpl');
const replikeringBindings = require('../../apiSpecification/replikering/dbBindings');

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

exports.getJsonFromHandler = (client, handler, pathParams, queryParams) => go(function*() {
  const response = yield handler(client, 'http://dawa', pathParams, queryParams);
  const body =   yield resourceImpl.materializeBody(client, response);
  return JSON.parse(body);
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
  const binding = replikeringBindings[datamodelName];
  return Object.keys(binding.attributes).reduce((memo, attributeName) => {
    const bindingAttr = binding.attributes[attributeName];
    const column = bindingAttr.column;
    memo[column] = apiObject[attributeName];
    return memo;
  }, {});
};

exports.getResponse = getResponse;

exports.ait = (text, generator) => {
  it(text, q.async(generator));
};
