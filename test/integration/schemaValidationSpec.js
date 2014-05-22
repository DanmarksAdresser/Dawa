"use strict";
var dbapi = require('../../dbapi');
var _ = require('underscore');
var schemaValidationUtil = require('./schemaValidationUtil');

var registry = require('../../apiSpecification/registry');
require('../../apiSpecification/allSpecs');
/**
 * This test verifies that all testdata is valid according to JSON schema
 * and that all fields (except the ones specified in valuesNeverExpectedToBeSeen below)
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
    stormodtageradresser: true
  },
  vejnavne: {
    adresseringsnavn: true
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
  var allNamesAndKeys = registry.where({
    type: 'nameAndKey'
  });
  allNamesAndKeys.forEach(function(nameAndKey) {
    console.log(JSON.stringify(nameAndKey));
    var entityName = nameAndKey.singular;
    var sqlModel = registry.findWhere({
      entityName: entityName,
      type: 'sqlModel'
    });
    console.log(JSON.stringify(sqlModel));
    var jsonRepresentation = registry.findWhere({
      entityName: entityName,
      type: 'representation',
      qualifier: 'json'
    });
    console.log(JSON.stringify(jsonRepresentation));
    var mapper = jsonRepresentation.mapper('BASE_URL', {});
    it('Alle ' + nameAndKey.plural + ' skal validere', function(specDone) {
      console.log('validerer alle ' + nameAndKey.plural);
      var schema = jsonRepresentation.schema;
      dbapi.withReadonlyTransaction(function(err, client, transactionDone) {
        var query = sqlModel.createQuery(_.pluck(jsonRepresentation.fields, 'name'), {});
        dbapi.queryRaw(client, query.sql, query.params, function(err, rows) {
          rows.forEach(function(row) {
            var json = mapper(row);
            expect(schemaValidationUtil.isSchemaValid(json, schema)).toBe(true);
          });
          transactionDone();
          specDone();
        });
      });
    });
    it('Alle felter i ' + nameAndKey.plural + ' skal ses mindst en gang', function(specDone) {
      var schema = jsonRepresentation.schema;
      var valuesSeen = valuesNeverExpectedToBeSeen[nameAndKey.plural] || {};
      dbapi.withReadonlyTransaction(function(err, client, transactionDone) {
        var query = sqlModel.createQuery(_.pluck(jsonRepresentation.fields, 'name'), {});
        dbapi.queryRaw(client, query.sql, query.params, function(err, rows) {
          rows.forEach(function(row) {
            var json = mapper(row);
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
