"use strict";

var expect = require('chai').expect;
var request = require("request-promise");
var q = require('q');

var registry = require('../../apiSpecification/registry');
var resourceImpl = require('../../apiSpecification/common/resourceImpl');
var testdb = require('../helpers/testdb');
var tema = require('../../temaer/tema');
require('../../apiSpecification/allSpecs');

describe('Filtrering af adresser ud fra DAGI tema kode', function() {
  // der er 390 adgangsadresser inden for denne polygon
  var sampleTema = {
    tema: 'sogn',
    fields: {
      kode: 10,
      navn: 'Test sogn'
    },
    polygons: ['POLYGON((' +
      '725025.18 6166264.37,' +
      '725025.18 6167537.76,' +
      '731289.6 6167537.76,' +
      '731289.6 6166264.37,' +
      '725025.18 6166264.37))']
  };

  var expectedResultsSogn = {
    adgangsadresse: 277,
    adresse: 279
  };
  var expectedResultsZone1 = {
    adgangsadresse: 1,
    adresse: 1
  };
  var expectedResultWithoutSogn = {
    adgangsadresse: 1319,
    adresse: 2801
  };

  var temaSpec = tema.findTema('sogn');
  ['adgangsadresse', 'adresse'].forEach(function(entityName) {
    var resourceSpec = registry.findWhere({
      entityName: entityName,
      type: 'resource',
      qualifier: 'query'
    });
    it(' for sogn på ' + entityName, function () {
      this.timeout(10000);
      return testdb.withTransaction('test', 'ROLLBACK', function (client) {
        return q.nfcall(tema.addTema, client, sampleTema)
          .then(function () {
            return tema.updateAdresserTemaerView(client, temaSpec, false);
          })
          .then(function () {
            var params = {sognekode: "10"};
            var processedParams = resourceImpl.internal.parseAndProcessParameters(resourceSpec, [], params).processedParams;
            var query = resourceSpec.sqlModel.createQuery(['id'], processedParams);
            return client.queryp(query.sql, query.params);
          })
          .then(function (result) {
            expect(result.rows.length).to.equal(expectedResultsSogn[entityName]);
          });
      });
    });

    it('Query på både ejerlav og matrikelnr', function() {
      return request.get({url: 'http://localhost:3002' + resourceSpec.path + '?ejerlavkode=20551&matrikelnr=ab1f', json: true}).then(function(result) {
        expect(result.length).to.equal(1);
      });
    });

    it(' for '  + entityName + 'r uden sognetilknytning', function (done) {
      this.timeout(10000);
      request.get({url: 'http://localhost:3002' + resourceSpec.path + '?sognekode=', json: true}, function(error, response, result) {
        expect(result.length).to.equal(expectedResultWithoutSogn[entityName]);
        done();
      });
    });

    it(' for zone på '  + entityName, function (done) {
      this.timeout(10000);
      request.get({url: 'http://localhost:3002' + resourceSpec.path + '?zonekode=1', json: true}, function(error, response, result) {
        expect(result.length).to.equal(expectedResultsZone1[entityName]);
        done();
      });
    });

    it(' for '  + entityName + 'r uden zonetilknytning', function (done) {
      this.timeout(5000);
      request.get({url: 'http://localhost:3002' + resourceSpec.path, json: true}, function(error, response, result) {
        var totalCount = result.length;
        // we know that only associations to zone 1 exists, so the expected count can be computed from totalCount and the expected number of hits for zone 1
        request.get({url: 'http://localhost:3002' + resourceSpec.path + '?zonekode=', json: true}, function(error, response, result) {
          expect(result.length).to.equal(totalCount - expectedResultsZone1[entityName]);
          done();
        });
      });
    });
  });
});
