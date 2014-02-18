"use strict";
var apiSpec = require('../../apiSpec');
var dbapi = require('../../dbapi');
var ZSchema = require('z-schema');

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

describe('Validering af JSON-formatteret output', function() {
  var specsToTest = ['vejstykke', 'vejnavn', 'postnummer', 'kommune', 'adgangsadresse', 'adresse', 'supplerendeBynavn'];
  specsToTest.forEach(function(specName) {
    var spec = apiSpec[specName];
    it('Alle ' + spec.model.plural + ' skal validere', function(specDone) {
      console.log('validerer alle ' + spec.model.plural);
      dbapi.withTransaction(function(err, client, transactionDone) {
        dbapi.query(client, spec, {}, {}, function(err, rows) {
          rows.forEach(function(row) {
            var json = spec.mappers.json(row);
            expectSchemaValid(json, spec.model.schema);
          });
          transactionDone();
          specDone();
        });
      });
    });
  });
});