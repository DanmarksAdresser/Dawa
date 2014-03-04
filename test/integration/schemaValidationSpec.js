"use strict";
var apiSpec = require('../../apiSpec');
var apiSpecUtil = require('../../apiSpecUtil');
var dbapi = require('../../dbapi');
var _ = require('underscore');
var schemaValidationUtil = require('./schemaValidationUtil');

/**
 * This test verifies that all testdata is valid according to JSON schema
 * and that all fields (except the ones specified in valuesNeverExpectedToBeSeen below)
 * is returned at least once.
 */

var specsToTest = apiSpec.allSpecNames;

var valuesNeverExpectedToBeSeen = {
  postnumre: {
    stormodtageradresse: true
  },
  adgangsadresser: {
    sogn: {
      kode: true,
      navn: true
    },
    retskreds: {
      kode: true,
      navn: true
    },
    politikreds: {
      kode: true,
      navn: true
    },
    opstillingskreds: {
      kode: true,
      navn: true
    },
    afstemningsområde: {
      kode: true,
      navn: true
    },
    region: {
      kode: true,
      navn: true
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
      console.log('no value ever seen for ' + keyPath);
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
  specsToTest.forEach(function(specName) {
    var spec = apiSpec[specName];
    it('Alle ' + spec.model.plural + ' skal validere', function(specDone) {
      console.log('validerer alle ' + spec.model.plural);
      var schema = spec.model.schema;
      dbapi.withReadonlyTransaction(function(err, client, transactionDone) {
        var sqlParts = apiSpecUtil.createSqlParts(spec, {}, {});
        dbapi.query(client, sqlParts, function(err, rows) {
          rows.forEach(function(row) {
            var json = spec.mappers.json(row, {baseUrl: "BASE_URL"});
            expect(schemaValidationUtil.isSchemaValid(json, schema)).toBe(true);
          });
          transactionDone();
          specDone();
        });
      });
    });
    it('Alle felter i' + spec.model.plural + ' skal ses mindst en gang', function(specDone) {
      var schema = spec.model.schema;
      var valuesSeen = valuesNeverExpectedToBeSeen[spec.model.plural] || {};
      dbapi.withReadonlyTransaction(function(err, client, transactionDone) {
        var sqlParts = apiSpecUtil.createSqlParts(spec, {}, {});
        dbapi.query(client, sqlParts, function(err, rows) {
          rows.forEach(function(row) {
            var json = spec.mappers.json(row, {baseUrl: "BASE_URL"});
            recordVisitedValues(json, schema, valuesSeen);
          });
          transactionDone();
          expect(verifyAllValuesVisited(schema, valuesSeen)).toBe(true);
          specDone();
        });
      });
    });
  });
});
