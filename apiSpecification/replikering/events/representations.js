"use strict";

var columnMappings = require('./../columnMappings').columnMappings;
var _ = require('underscore');
var globalSchemaObject = require('../../commonSchemaDefinitionsUtil').globalSchemaObject;
var normalizedFieldSchemas = require('../normalizedFieldSchemas');
const fieldsMap = require('./fields');
const representationUtil = require('../../common/representationUtil');

var datamodelNames = Object.keys(columnMappings);

_.each(datamodelNames, function(datamodelName) {
  const fields = fieldsMap[datamodelName];

  var schema = globalSchemaObject({
    title: datamodelName + "hændelse",
    properties: {
      sekvensnummer: {
        description: 'Unikt sekvensnummer for hændelsen.',
        type: 'integer'
      },
      tidspunkt: {
        postgresql: null,
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
    },
    flat: representationUtil.defaultFlatRepresentation(fields)
  };
});

var registry = require('../../registry');
_.each(exports, function(representation, key) {
  registry.add(key + '_hændelse', 'representation', 'json', representation.json);
});
