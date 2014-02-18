"use strict";
var apiSpec = require('../../apiSpec');
var dbapi = require('../../dbapi');
var ZSchema = require('z-schema');
var _ = require('underscore');

var zSchemaValidator = new ZSchema({noZeroLengthStrings: true,
  noExtraKeywords: true,
  forceItems: true,
  forceProperties: true,
  sync: true
});

function expectSchemaValid(object, schema) {
  var valid = zSchemaValidator.validate(object, schema);
  expect(valid).toBe(true);
  if(!valid) {
    console.log("invalid json: " + JSON.stringify(object));
    console.log(zSchemaValidator.getLastError());
  }
}

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
  var specsToTest = ['vejstykke', 'vejnavn', 'postnummer', 'kommune', 'adgangsadresse', 'adresse', 'supplerendeBynavn'];

  var valuesNeverExpectedToBeSeen = {
    postnumre: {
      stormodtageradresse: true
    },
    adgangsadresser: {
      supplerendebynavn: true, // todo kræver bedre testdata
      sogn: {
        nr: true,
        navn: true
      },
      retskreds: {
        nr: true,
        navn: true
      },
      politikreds: {
        nr: true,
        navn: true
      },
      opstillingskreds: {
        nr: true,
        navn: true
      },
      afstemningsområde: {
        nr: true,
        navn: true
      },
      region: {
        nr: true,
        navn: true
      }
    },
    supplerendebynavne: { // todo kræver bedre testdata
      href: true,
      navn: true,
      postnumre: {
        href: true,
        nr: true,
        navn: true
      },
      kommuner: {
        href: true,
        kode: true,
        navn: true
      }
    }
  };
  specsToTest.forEach(function(specName) {
    var spec = apiSpec[specName];
    it('Alle ' + spec.model.plural + ' skal validere', function(specDone) {
      console.log('validerer alle ' + spec.model.plural);
      var schema = spec.model.schema;
      dbapi.withTransaction(function(err, client, transactionDone) {
        dbapi.query(client, spec, {}, {}, function(err, rows) {
          rows.forEach(function(row) {
            var json = spec.mappers.json(row);
            expectSchemaValid(json, schema);
          });
          transactionDone();
          specDone();
        });
      });
    });
    it('Alle felter i' + spec.model.plural + ' skal ses mindst en gang', function(specDone) {
      var schema = spec.model.schema;
      var valuesSeen = valuesNeverExpectedToBeSeen[spec.model.plural] || {};
      dbapi.withTransaction(function(err, client, transactionDone) {
        dbapi.query(client, spec, {}, {}, function(err, rows) {
          rows.forEach(function(row) {
            var json = spec.mappers.json(row);
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