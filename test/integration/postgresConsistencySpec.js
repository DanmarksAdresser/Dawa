"use strict";

var sqlCommon = require('../../psql/common');
var crud = require('../../crud/crud');
var datamodels = require('../../crud/datamodel');

describe('Triggers in PostgreSQL should maintain a consistent state', function() {
  var client;
  var transactionDone;
  beforeEach(function(done) {
    sqlCommon.withWriteTransaction(process.env.pgEmptyDbUrl, function(err, _client, _transactionDone){
      if(err) {
        return done(err);
      }
      client = _client;
      transactionDone = _transactionDone;
      done();
    });
  });

  it('The geom column of adgangsadresser should be maintained', function(done) {
    var adgangsadresse = {
      "id": "038edf0e-001b-4d9d-a1c7-b71cb354680f",
        "kommunekode": 607,
        "vejkode": 4899,
        "husnr": "22",
        "supplerendebynavn": "Brovad",
        "postnr": 7000,
        "oprettet": "2014-05-22T14:56:22.237Z",
        "aendret": "2014-05-22T15:50:49.437Z",
        "ikraftfra": "2014-05-22T00:00:00.000Z",
        "ejerlavkode": 1160252,
        "ejerlavnavn": "HENN.LADEGÅRD,ER",
        "matrikelnr": "18a",
        "esrejendomsnr": 35466,
        "adgangspunktid": "12345678-1234-1234-1234-123456789012",
        "etrs89oest": 542187.19,
        "etrs89nord": 6155336.05,
        "wgs84long": 9.66855050231446,
        "wgs84lat": 55.5422315147133,
        "noejagtighed": "A",
        "kilde": 5,
        "tekniskstandard": "TK",
        "tekstretning": "200.00",
        "adressepunktaendringsdato": "2014-05-22T23:59:00.000Z",
        "kn100mdk": "100m_61553_5421",
        "kn1kmdk": "1km_6155_542",
        "kn10kmdk": "10km_615_54"
    };
    crud.create(client, datamodels.adgangsadresse, adgangsadresse, function(err) {
      if(err) {
        throw err;
      }
      client.query('SELECT geom FROM adgangsadresser where id = $1', ["038edf0e-001b-4d9d-a1c7-b71cb354680f"], function(err, result) {
        expect(result.rows.length).toBe(1);
        var geom = result.rows[0].geom;
        expect(geom).toBe('0101000020E864000014AE4761D68B204133333303127B5741');
        done();
      });
    });
  });

  afterEach(function(done) {
    transactionDone('rollback', function(err) {
      done();
    });
  });
});