"use strict";

var chai = require('chai');
var _ = require('underscore');
var q = require('q');

var registry = require('../../apiSpecification/registry');
var schemaValid = require('../helpers/schemaValid');
var testdb = require('../helpers/testdb');

var expect = chai.expect;
chai.use(schemaValid);

require('../../apiSpecification/allSpecs');
/**
 * This test verifies that all testdata is valid according to JSON schema
 * and that all fieldMap (except the ones specified in valuesNeverExpectedToBeSeen below)
 * is returned at least once.
 */

var valuesNeverExpectedToBeSeen = {
  vejstykker: {
    adresseringsnavn: true,
    historik: {
      oprettet: true,
      ændret: true
    }
  },
  postnumre: {
  },
  vejnavne: {
  },
  adgangsadresser: {
    ejerlav: {
      kode: true,
      navn: true
    },
    matrikelnr: true,
    esrejendomsnr: true,
    historik: {
      oprettet: true,
      ændret: true
    }
  },
  adresser: {
    matrikelnr: true,
    esrejendomsnr: true,
    adgangsadresse: {
      ejerlav: {
        kode: true,
        navn: true
      },
      matrikelnr: true,
      esrejendomsnr: true
    },
    historik: {
      oprettet: true,
      ændret: true
    }
  },
  navngivneveje: {
    beskrivelse: true,
    vejstykker: {
      href: true,
      kommunekode: true,
      kode: true
    }
  }
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
    var keyPath = prefix + '.' + key;
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
  var allNamesAndKeys = registry.where({
    type: 'nameAndKey'
  });
  allNamesAndKeys.forEach(function(nameAndKey) {
    var entityName = nameAndKey.singular;
    var sqlModel = registry.findWhere({
      entityName: entityName,
      type: 'sqlModel'
    });
    var jsonRepresentation = registry.findWhere({
      entityName: entityName,
      type: 'representation',
      qualifier: 'json'
    });
    if(!jsonRepresentation) {
      return;
    }
    if(!sqlModel) {
      return;
    }
    var mapper = jsonRepresentation.mapper('BASE_URL', {});
    var schema = jsonRepresentation.schema;
    if(!schema) {
      throw new Error('no schema for ' + nameAndKey.singular);
    }
    it('Alle ' + nameAndKey.plural + ' skal validere', function() {
      return testdb.withTransaction('test', 'READ_ONLY', function(client) {
        return q.ninvoke(sqlModel, 'query', client, _.pluck(jsonRepresentation.fields, 'name'), {}).then(function(rows) {
          rows.forEach(function(row) {
            var json = mapper(row);
            expect(json).to.be.schemaValid(schema);
          });
        });
      });
    });
    it('Alle felter i ' + nameAndKey.plural + ' skal ses mindst en gang', function() {
      var schema = jsonRepresentation.schema;
      var valuesSeen = valuesNeverExpectedToBeSeen[nameAndKey.plural] || {};
      return testdb.withTransaction('test', 'READ_ONLY', function(client) {
        return q.ninvoke(sqlModel, 'query', client, _.pluck(jsonRepresentation.fields, 'name'), {}).then(function(rows) {
          rows.forEach(function(row) {
            var json = mapper(row);
            recordVisitedValues(json, schema, valuesSeen);
          });
          expect(verifyAllValuesVisited(schema, valuesSeen)).to.equal(true);
        });
      });
    });
  });
});
