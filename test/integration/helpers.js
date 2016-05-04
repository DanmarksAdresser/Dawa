"use strict";

var q = require('q');
var _ = require('underscore');

var columnMappings = require('../../apiSpecification/replikering/columnMappings');
var csvParse = require('csv-parse');
var resourceImpl = require('../../apiSpecification/common/resourceImpl');

function getResponse(dbClient, resourceSpec, pathParams, queryParams, callback) {
  return resourceImpl.resourceResponse( dbClient, resourceSpec, {params: pathParams, query: queryParams, headers: {}}).then(function(response) {
    if(response.bodyPipe) {
      return q.ninvoke(response.bodyPipe, 'toArray').then(function(result) {
        delete response.bodyPipe;
        response.body = result.join('');
        return response;
      });
    }
    else {
      return response;
    }
  }).nodeify(callback);
}

// Get the response of a resource as a string
exports.getStringResponse = function(dbClient, resourceSpec, pathParams, queryParams, callback) {
  return q.async(function*() {
    const res = yield getResponse(dbClient, resourceSpec, pathParams, queryParams);
    if(res.status !== 200) {
      throw new Error('Unexpected status code: ' + res.status);
    }
    return res.body;
  })().nodeify(callback);
};

// Get the response of a resource as JSON
exports.getJson = function(dbClient, resourceSpec, pathParams, queryParams, callback) {
  return q.async(function*() {
    const str = yield exports.getStringResponse( dbClient, resourceSpec, pathParams, queryParams);
    return JSON.parse(str);
  })().nodeify(callback);
};

// get the response of a resource and parse as CSV
exports.getCsv = function(dbClient, resourceSpec, pathParams, queryParams, callback) {
  return q.async(function*() {
    queryParams.format = 'csv';
    const str = yield exports.getStringResponse(dbClient, resourceSpec, pathParams, queryParams);
    return yield q.nfcall(csvParse, str, {columns: true});
  })().nodeify(callback);
};

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
