"use strict";

const chai = require('chai');
const _ = require('underscore');
const { go } = require('ts-csp');

const registry = require('../../apiSpecification/registry');
const schemaValid = require('../helpers/schema-valid');
const testdb = require('@dawadk/test-util/src/testdb');

const expect = chai.expect;
chai.use(schemaValid);

require('../../apiSpecification/allSpecs');
/**
 * This test verifies that all testdata is valid according to JSON schema
 * and that all fieldMap (except the ones specified in valuesNeverExpectedToBeSeen below)
 * is returned at least once.
 */

const valuesNeverExpectedToBeSeen = {
  json: {
    vejstykker: {
      historik: {
        ændret: true
      }
    },
    adresser: {
    },
    navngivneveje: {
      beskrivelse: true,
      beliggenhed: {
        vejtilslutningspunkter: {
          type: true,
          coordinates: true
        }
      },
      historik: {
        nedlagt: true
      }
    }
  },
  flat: {},
  mini: {}
};

function hasType(schema, type) {
  return schema.type === type || (_.isArray(schema.type) && schema.type.indexOf(type) !== -1);
}

function recordVisitedValues(json, schema, record) {
  _.each(schema.properties, function(typeDef, key) {
    if(json[key] !== undefined && json[key] !== null) {
      if(hasType(typeDef, 'object')) {
        record[key] = record[key] || {};
        recordVisitedValues(json[key],typeDef, record[key]);
      }
      else if(hasType(typeDef, 'array')) {
        record[key] = record[key] || {};
        _.each(json[key], function(json) {
          recordVisitedValues(json,typeDef.items, record[key]);
        });
      }
      else {
        record[key] = true;
      }
    }
  });
}

function verifyAllValuesVisited(schema, record, prefix) {
  prefix = prefix || '';
  return _.reduce(schema.properties, function(memo, typeDef, key) {
    const keyPath = prefix + '.' + key;
    if(record[key] === undefined) {
      /*eslint no-console: 0 */
      console.log('KEY NOT SEEN: ' + key);
      return false;
    }
    if(hasType(typeDef, 'object')) {
      return memo && verifyAllValuesVisited(typeDef, record[key], keyPath);
    }
    if(hasType(typeDef, 'array')) {
      return memo && verifyAllValuesVisited(typeDef.items, record[key], keyPath);
    }
    return memo;
  }, true);
}

describe('Validering af JSON-formatteret output', function() {
  const allNamesAndKeys = registry.where({
    type: 'nameAndKey'
  });
  allNamesAndKeys.forEach(function(nameAndKey) {
    const entityName = nameAndKey.singular;
    const sqlModel = registry.findWhere({
      entityName: entityName,
      type: 'sqlModel'
    });
    for(let qualifier of ['json', 'flat', 'mini']) {
      const representation = registry.findWhere({
        entityName: entityName,
        type: 'representation',
        qualifier
      });
      if(!representation) {
        return;
      }
      if(!sqlModel) {
        return;
      }
      const mapper = representation.mapper('BASE_URL', {});
      const schema = representation.schema;
      if(!schema) {
        if(qualifier === 'json') {
          throw new Error('no schema for ' + nameAndKey.singular);
        }
        else {
          continue;
        }
      }
      it(`Alle ${nameAndKey.plural} for representation ${qualifier} skal validere`, function() {
        return testdb.withTransaction('test', 'READ_ONLY', client => go(function*() {
          const rows = yield sqlModel.processQuery(client, _.pluck(representation.fields, 'name'), {});
          rows.forEach(function(row) {
            const json = mapper(row);
            expect(json).to.be.schemaValid(schema);
          });
        }));
      });
      it('Alle felter i ' + nameAndKey.plural + ' skal ses mindst en gang', function() {
        const schema = representation.schema;
        const valuesSeen = valuesNeverExpectedToBeSeen[qualifier][nameAndKey.plural] || {};
        return testdb.withTransaction('test', 'READ_ONLY', client => go(function*() {
          const rows = yield sqlModel.processQuery(client, _.pluck(representation.fields, 'name'), {medtagnedlagte: true});
          rows.forEach(function (row) {
            const json = mapper(row);
            recordVisitedValues(json, schema, valuesSeen);
          });
          expect(verifyAllValuesVisited(schema, valuesSeen)).to.equal(true);
        }));
      });
    }
  });
});
