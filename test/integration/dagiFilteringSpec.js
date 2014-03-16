"use strict";

var dagi = require('../../dagi');
var dbapi = require('../../dbapi');
var registry = require('../../apiSpecification/registry');
require('../../apiSpecification/allSpecs');

describe('Filtrering af adresser ud fra DAGI tema kode', function() {
  // der er 390 adgangsadresser inden for denne polygon
  var sampleTema = {
    tema: 'region',
    kode: 10,
    navn: 'Test Region',
    polygons: ['POLYGON((582534.985506234 6128945.80096767,' +
      '588883.402508489 6129068.80096925,' +
      '588659.687757301 6140196.17148899,' +
      '582534.985506234 6128945.80096767))']
  };

  var expectedResults = {
    adgangsadresse: 158,
    adresse: 390
  };
  ['adgangsadresse', 'adresse'].forEach(function(entityName) {
    var sqlModel = registry.findWhere({
      entityName: entityName,
      type: 'sqlModel'
    });
    it('Skal være muligt at filtrere '  + entityName + 'r ud fra DAGI tema', function (done) {
      dbapi.withRollbackTransaction(function (err, client, transactionDone) {
        if (err) throw err;
        dagi.addDagiTema(client, sampleTema, function (err) {
          if(err) throw err;
          var params = { regionskode: [10] };
          var sqlParts = sqlModel.createQuery(['id'], params);
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