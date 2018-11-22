"use strict";

const _ = require('underscore');
const globalSchemaObject = require('../../commonSchemaDefinitionsUtil').globalSchemaObject;
const normalizedFieldSchemas = require('../normalizedFieldSchemas');
const fieldsMap = require('./fields');
const representationUtil = require('../../common/representationUtil');

const datamodels = require('../datamodel');
const bindings = require('../dbBindings');

for(let datamodelName of Object.keys(datamodels)) {
  const fields = fieldsMap[datamodelName];
  const datamodel = datamodels[datamodelName];
  const binding = bindings[datamodelName];
  const schema = globalSchemaObject({
    title: datamodelName + "hændelse",
    properties: {
      txid: {
        description: `Transaktions-ID. Transaktions-ID er fortløbende og genereres af DAWA hver gang
        nye kildedata indlæses.`,
        type: 'integer'
      },
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
    docOrder: ['txid', 'sekvensnummer', 'tidspunkt', 'operation', 'data']
  });
  const jsonMapper = function(row) {
    const result = {
      txid: row.txid,
      operation: row.operation,
      tidspunkt: row.tidspunkt,
      sekvensnummer: row.sekvensnummer
    };
    result.data = datamodel.attributes.reduce((memo, attribute) => {
      const formatFn = binding.attributes[attribute.name].formatter;
      memo[attribute.name] = formatFn(row[attribute.name]);
      if(memo[attribute.name] === undefined) {
        memo[attribute.name] = null;
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
}

const registry = require('../../registry');
_.each(exports, function(representation, key) {
  registry.add(key + '_hændelse', 'representation', 'json', representation.json);
});
