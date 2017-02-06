"use strict";

var expect = require('chai').expect;
var q = require('q');

var crud = require('../../crud/crud');
var Husnr = require('../../psql/databaseTypes').Husnr;
var datamodels = require('../../crud/datamodel');
var testdb = require('../helpers/testdb2');

describe('Triggers in PostgreSQL should maintain a consistent state', function () {
  testdb.withTransactionEach('empty', function (clientFn) {
    it('The geom column of adgangsadresser should be maintained', function () {
      var client = clientFn();
      var adgangsadresse = {
        "id": "038edf0e-001b-4d9d-a1c7-b71cb354680f",
        "kommunekode": 607,
        "vejkode": 4899,
        "husnr": new Husnr(22, null),
        "supplerendebynavn": "Brovad",
        "postnr": 7000,
        "oprettet": "2014-05-22T14:56:22.237Z",
        "aendret": "2014-05-22T15:50:49.437Z",
        "ikraftfra": "2014-05-22T00:00:00.000Z",
        "ejerlavkode": 1160252,
        "matrikelnr": "18a",
        "esrejendomsnr": 35466,
        "adgangspunktid": "12345678-1234-1234-1234-123456789012",
        "etrs89oest": 542187.19,
        "etrs89nord": 6155336.05,
        "noejagtighed": "A",
        "adgangspunktkilde": 5,
        "tekniskstandard": "TK",
        "tekstretning": "200.00",
        "adressepunktaendringsdato": "2014-05-22T23:59:00.000Z"
      };

      return q.nfcall(crud.create, client, datamodels.adgangsadresse, adgangsadresse)
        .then(function () {
          return client.queryp('SELECT geom FROM adgangsadresser where id = $1', ["038edf0e-001b-4d9d-a1c7-b71cb354680f"]);
        })
        .then(function (result) {
          expect(result.rows.length).to.equal(1);
          var geom = result.rows[0].geom;
          expect(geom).to.equal('0101000020E864000014AE4761D68B204133333303127B5741');
        });
    });
  });
});
