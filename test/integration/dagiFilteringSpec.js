"use strict";

var dagi = require('../../dagiImport/dagi');
var dbapi = require('../../dbapi');
var registry = require('../../apiSpecification/registry');
var resourceImpl = require('../../apiSpecification/common/resourceImpl');
require('../../apiSpecification/allSpecs');

describe('Filtrering af adresser ud fra DAGI tema kode', function() {
  // der er 390 adgangsadresser inden for denne polygon
  var sampleTema = {
    tema: 'region',
    kode: 10,
    navn: 'Test Region',
    polygons: ['POLYGON((' +
      '725025.18 6166264.37,' +
      '725025.18 6167537.76,' +
      '731289.6 6167537.76,' +
      '731289.6 6166264.37,' +
      '725025.18 6166264.37))']
  };

  var expectedResults = {
    adgangsadresse: 277,
    adresse: 279
  };
  ['adgangsadresse', 'adresse'].forEach(function(entityName) {
    var resourceSpec = registry.findWhere({
      entityName: entityName,
      type: 'resource',
      qualifier: 'query'
    });
    it('Skal være muligt at filtrere '  + entityName + 'r ud fra DAGI tema', function (done) {
      dbapi.withRollbackTransaction(function (err, client, transactionDone) {
        if (err) throw err;
        dagi.addDagiTema(client, sampleTema, function (err) {
          if(err) throw err;
          var params = { regionskode: "10" };
          var processedParams = resourceImpl.internal.parseAndProcessParameters(resourceSpec, [], params).processedParams;
          var sqlParts = resourceSpec.sqlModel.createQuery(['id'], processedParams);
          dbapi.query(client, sqlParts, function(err, result) {
            if(err) throw err;
            expect(result.length).toBe(expectedResults[entityName]);
            transactionDone();
            done();
          });
        });
      });
    });
  });
});