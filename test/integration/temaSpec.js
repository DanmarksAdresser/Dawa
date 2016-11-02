"use strict";

var expect = require('chai').expect;
var _ = require('underscore');

var dagiTemaer = require('../../apiSpecification/temaer/temaer');
var tema = require('../../temaer/tema');
var testdb = require('../helpers/testdb');

// der er 390 adgangsadresser inden for denne polygon
var sampleTema = {
  tema: 'region',
  fields: {
    kode: 10,
    navn: 'Test Region xxyyzz'
  },
  polygons: ['POLYGON((' +
    '725025.18 6166264.37,' +
    '725025.18 6167537.76,' +
    '731289.6 6167537.76,' +
    '731289.6 6166264.37,' +
    '725025.18 6166264.37))']
};

var sampleTemaDef = _.findWhere(dagiTemaer, { singular: sampleTema.tema });

describe('DAGI updates', function() {
  it('When adding a new DAGI tema, the adgangsadresser_temaer_matview table should be updated', function () {
    return testdb.withTransaction('test', 'ROLLBACK', function (client) {
      return tema.addTema(client, sampleTema)
        .tap(function () {
          return tema.updateAdresserTemaerView(client, sampleTemaDef, false, 10000, true);
        })
        .then(function (createdTemaId) {
          return client.queryp("select count(*) as c FROM adgangsadresser_temaer_matview WHERE tema = 'region' AND tema_id = $1", [createdTemaId]);
        })
        .then(function (result) {
          expect(result.rows[0].c).to.equal('281');
        });
    });
  });

  it('When deleting a DAGI tema, the adgangsadresser_temaer_matview table should be updated', function() {
    return testdb.withTransaction('test', 'ROLLBACK', function (client) {
      return tema.addTema(client, sampleTema)
        .then(function (createdTemaId) {
          return tema.deleteTema(client, sampleTemaDef, sampleTema).then(function () {
            return client.queryp(
              "select count(*) as c FROM adgangsadresser_temaer_matview WHERE tema = 'region' AND tema_id = $1",
              [createdTemaId]);
          });
        }).then(function (result) {
          expect(result.rows[0].c).to.equal('0');
        });
    });
  });

  describe('Update of DAGI tema', function() {

    testdb.withTransactionEach('test', function (clientFn) {
      var createdTemaId;
      beforeEach(function () {
        var client = clientFn();
        return tema.addTema(client, sampleTema).then(function (_createdTemaId) {
          createdTemaId = _createdTemaId;
          var updated = _.clone(sampleTema);
          updated.polygons = ['POLYGON((' +
          '725025.18 6166264.37,' +
          '725025.18 6167400.76,' +
          '731289.6 6167400.76,' +
          '731289.6 6166264.37,' +
          '725025.18 6166264.37))'];
          return tema.updateTema(client, sampleTemaDef, updated);
        }).then(function () {
          return tema.updateAdresserTemaerView(client, sampleTemaDef, false, 10000, true);
        });
      });

      it('When updating a DAGI tema, the adgangsadresser_temaer_matview table should be updated', function() {
        return clientFn().queryp(
          "select count(*) as c FROM adgangsadresser_temaer_matview WHERE tema = 'region' AND tema_id = $1",
          [createdTemaId]).then(function(result) {
            expect(result.rows[0].c).to.equal('228');
          });
      });

      it('When updating a tema, the geo_version should be updated', function () {
        return clientFn().queryp("select geo_version from temaer where id = $1", [createdTemaId])
          .then(function (result) {
            expect(result.rows[0].geo_version).to.equal(2);
          });
      });
    });

    it('When adding a new DAGI tema, the tsv column should be populated', function() {
      return testdb.withTransaction('test', 'ROLLBACK', function(client) {
        return tema.addTema(client, sampleTema).then(function() {
          return client.queryp("select count(*) as c FROM temaer WHERE to_tsquery('adresser', 'xxyyzz') @@ tsv").then(function(result) {
            expect(result.rows[0].c).to.equal('1');
          });
        });
      });
    });

    it('When updating a DAGI tema, the tsv column should be updated', function() {
      return testdb.withTransaction('test', 'ROLLBACK', function(client) {
        return tema.addTema(client, sampleTema).then(function() {
          var updated = _.clone(sampleTema);
          updated.fields.navn = 'Foo';
          return tema.updateTema(client, sampleTemaDef, updated);
        }).then(function() {
          return client.queryp( "select count(*) as c FROM temaer WHERE to_tsquery('adresser', 'Foo') @@ tsv", []);
        }).then(function(result) {
          expect(result.rows[0].c).to.equal('1');
        });
      });
    });

    it('When deleting a DAGI tema, the slettet property should be set to true, and the geometry deleted', function() {
      return testdb.withTransaction('test', 'ROLLBACK', function(client) {
        return tema.addTema(client, sampleTema).then(function() {
          return tema.deleteTema(client, sampleTemaDef, sampleTema);
        }).then(function() {
          return client.queryp(
            "select slettet, geom from temaer where tema = $1 and fields->>'kode' = $2",
            ['region', "10"]);
        }).then(function(result) {
          expect(result.rows).to.have.length(1);
          expect(result.rows[0].slettet).to.not.be.null;
          expect(result.rows[0].geom).to.be.null;
        });
      });
    });
    it('When recreating a DAGI tema which has prevously been deleted, the slettet property should be not null and the' +
    ' geometry should be updated', function() {
      return testdb.withTransaction('test', 'ROLLBACK', function(client) {
        return tema.addTema(client, sampleTema)
          .then(function() {
          return tema.deleteTema(client, sampleTemaDef, sampleTema);
        })
          .then(function() {
            return tema.addTema(client, sampleTema);
          })
          .then(function() {
          return client.queryp(
            "select slettet, geom from temaer where tema = $1 and fields->>'kode' = $2",
            ['region', "10"]);
        }).then(function(result) {
          expect(result.rows).to.have.length(1);
          expect(result.rows[0].slettet).be.null;
          expect(result.rows[0].geom).to.not.be.null;
        });
      });
    });
  });
});
