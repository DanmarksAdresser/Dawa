"use strict";

var dagi = require('../../dagiImport/dagi');
var dbapi = require('../../dbapi');
var registry = require('../../apiSpecification/registry');
var resourceImpl = require('../../apiSpecification/common/resourceImpl');
var request = require("request");
require('../../apiSpecification/allSpecs');

describe('Filtrering af adresser ud fra DAGI tema kode', function() {
  // der er 390 adgangsadresser inden for denne polygon
  var sampleTema = {
    tema: 'region',
    fields: {
      kode: 10,
      navn: 'Test Region'
    },
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
          dagi.updateAdresserTemaerView(client, 'region').nodeify( function(err) {
            if(err) throw err;
            var params = { regionskode: "10" };
            var processedParams = resourceImpl.internal.parseAndProcessParameters(resourceSpec, [], params).processedParams;
            var query = resourceSpec.sqlModel.createQuery(['id'], processedParams);
            dbapi.queryRaw(client, query.sql, query.params, function(err, result) {
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
});

describe('Fremsøgning af entiteter uden dagitilknytning', function() {
  // kun 1 adgangsadresse har en regionstilknytning i adgangsadresser_temaer_matview. We har 1320 adgangsadresser, 2802 adresser i alt
  var entitiesCountWithoutRegion = {
    adgangsadresse: 1319,
    adresse: 2801
  };

  ['adresse', 'adgangsadresse'].forEach(function(entityName) {
    var resourceSpec = registry.findWhere({
      entityName: entityName,
      type: 'resource',
      qualifier: 'query'
    });
    it('er muligt for '  + entityName + 'r uden regionstilknytning', function (done) {
      request.get({url: 'http://localhost:3002' + resourceSpec.path + '?regionskode=', json: true}, function(error, response, result) {
        expect(result.length).toBe(entitiesCountWithoutRegion[entityName]);
        done();
      });
    });
  });
});
