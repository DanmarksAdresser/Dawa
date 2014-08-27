"use strict";

var columnMappings = require('./../columnMappings').columnMappings;
var _ = require('underscore');
var eventDatamodels = require('./../eventDatamodels');
var schemaUtil = require('../../schemaUtil');
var globalSchemaObject = require('../../commonSchemaDefinitionsUtil').globalSchemaObject;
var normalizedFieldSchemas = require('../normalizedFieldSchemas');

var datamodelNames = Object.keys(eventDatamodels);

_.each(datamodelNames, function(datamodelName) {
  var schema = globalSchemaObject({
    title: datamodelName + "hændelse",
    properties: {
      sekvensnummer: {
        description: 'Unikt sekvensnummer for hændelsen.',
        type: 'integer'
      },
      tidspunkt: {
        description: 'Tidspunktet hvor hændelsen blev indlæst af DAWA.',
        $ref: '#/definitions/DateTimeUtc'
      },
      operation: {
        description: 'Hvilken type operation hændelsen vedrører: indsættelse, opdatering eller sletning.',
        enum: ['insert', 'update', 'delete']
      },
      data: normalizedFieldSchemas.schemas[datamodelName]
    },
    docOrder: ['sekvensnummer', 'tidspunkt', 'operation', 'data']
  });
  var jsonMapper = function(row) {
    var result = {
      operation: row.operation,
      tidspunkt: row.tidspunkt,
      sekvensnummer: row.sekvensnummer
    };
    result.data = _.reduce(columnMappings[datamodelName], function(memo, columnMapping) {
      var formatFn = columnMapping.formatter || _.identity;
      memo[columnMapping.name] = formatFn(row[columnMapping.name]);
      if(memo[columnMapping.name] === undefined) {
        memo[columnMapping.name] = null;
      }
      return memo;
    }, {});
    return result;
  };
  exports[datamodelName] = {
    json: {
      schema: schema,
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