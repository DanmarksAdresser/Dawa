"use strict";

const _ = require('underscore');
const globalSchemaObject = require('../../commonSchemaDefinitionsUtil').globalSchemaObject;
const normalizedFieldSchemas = require('../normalizedFieldSchemas');
const fieldsMap = require('./fields');
const representationUtil = require('../../common/representationUtil');

const datamodels = require('../datamodel');
const bindings = require('../dbBindings');
const { createRowFormatter } = require('../bindings/util');

for(let datamodelName of Object.keys(datamodels)) {
  const fields = fieldsMap[datamodelName];
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
  const defaultFlatRepresentation = representationUtil.defaultFlatRepresentation(fields);

  const dataMapper = createRowFormatter(binding);
  const jsonMapper = function(row) {
    const result = {
      txid: row.txid,
      operation: row.operation,
      tidspunkt: row.tidspunkt,
      sekvensnummer: row.sekvensnummer
    };
    result.data = dataMapper(row);
    return result;
  };
  exports[datamodelName] = {
    json: {
      schema: schema,
      fields: defaultFlatRepresentation.fields,
      outputFields: defaultFlatRepresentation.outputFields,
      mapper: function(baseUrl, params) {
        return jsonMapper;
      }
    },
    flat: {
      fields: defaultFlatRepresentation.fields,
      outputFields: defaultFlatRepresentation.outputFields,
      mapper: (baseUrl, params) =>  row => {
        return Object.assign({}, {
          txid: row.txid,
          operation: row.operation,
          tidspunkt: row.tidspunkt,
          sekvensnummer: row.sekvensnummer
        }, dataMapper(row));
      }
    }
  };
}

const registry = require('../../registry');
_.each(exports, function(representation, key) {
  registry.add(key + '_hændelse', 'representation', 'json', representation.json);
});
