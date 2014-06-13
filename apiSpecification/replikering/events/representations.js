"use strict";

var columnMappings = require('./../columnMappings').columnMappings;
var _ = require('underscore');
var eventDatamodels = require('./../eventDatamodels');

var datamodelNames = Object.keys(eventDatamodels);

_.each(datamodelNames, function(datamodelName) {
  var jsonMapper = function(row) {
    var result = {
      operation: row.operation,
      tidspunkt: row.tidspunkt,
      sekvensnummer: row.sekvensnummer
    };
    result.data = _.reduce(columnMappings[datamodelName], function(memo, columnMapping) {
      memo[columnMapping.name] = row[columnMapping.name];
      if(memo[columnMapping.name] === undefined) {
        memo[columnMapping.name] = null;
      }
      return memo;
    }, {});
    return result;
  };
  exports[datamodelName] = {
    json: {
      mapper: function(baseUrl, params) {
        return jsonMapper;
      }
    }
  };
});

var registry = require('../../registry');
_.each(exports, function(representation, key) {
  registry.add(key + '_hændelse', 'representation', 'json', representation.json);
});