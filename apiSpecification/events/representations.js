"use strict";

var columnMappings = require('./columnMappings');
var _ = require('underscore');

var datamodels = { vejstykke: require('../../crud/datamodel').vejstykke };

_.each(datamodels, function(datamodel, datamodelName) {
  var jsonMapper = function(row) {
    var result = {
      operation: row.operation,
      tidspunkt: row.time,
      sekvensnummer: row.sekvensnummer
    };
    result.data = _.reduce(columnMappings.vejstykke, function(memo, columnMapping) {
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

var registry = require('../registry');
_.each(exports, function(representation, key) {
  registry.add(key + '_hændelse', 'representation', 'json', representation.json);
});