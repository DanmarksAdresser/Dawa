//"use strict";
//
//// denne test foretager en insert, update og delete af hver entitet, og verificerer,
//// at udtræk samt hændelser hentet via APIet ser ud som forventet.
//// Ved opdateringen ændres samtlige felter.
//
//var Q = require('q');
//var format = require('util').format;
//var _ = require('underscore');
//
//var columnMappings = require('../../apiSpecification/replikering/columnMappings');
//var sqlCommon = require('../../sql/common');
//var crud = require('../../crud/crud');
//var datamodels = require('../../crud/datamodel');
//
//var insert = {
//  postnummer: {
//    "nr": 8260,
//    "navn": "Viby J",
//    "stormodtager": false
//  },
//  vejstykke: {
//    "kode": 2640,
//    "kommunekode": 846,
//    "navn": "Bymarken",
//    "adresseringsnavn": "Bymarken",
//    "oprettet": "2014-05-27T04:42:32.240Z",
//    "ændret": "2014-05-27T04:42:32.240Z"
//  },
//  adgangsadresse: {
//    "id": "038edf0e-001b-4d9d-a1c7-b71cb354680f",
//    "kommunekode": 607,
//    "vejkode": 4899,
//    "husnr": "22",
//    "supplerendebynavn": "Brovad",
//    "postnr": 7000,
//    "oprettet": "2014-05-22T14:56:22.237Z",
//    "ændret": "2014-05-22T15:50:49.437Z",
//    "ikrafttrædelsesdato": "2014-05-22T00:00:00.000Z",
//    "ejerlavkode": 1160252,
//    "ejerlavnavn": "HENN.LADEGÅRD,ER",
//    "matrikelnr": "18a",
//    "esrejendomsnr": 35466,
//    "etrs89koordinat_øst": 542187.19,
//    "etrs89koordinat_nord": 6155336.05,
//    "wgs84koordinat_længde": 9.66855050231446,
//    "wgs84koordinat_bredde": 55.5422315147133,
//    "nøjagtighed": "A",
//    "kilde": 5,
//    "tekniskstandard": "TK",
//    "tekstretning": "200.00",
//    "adressepunktændringsdato": "2014-05-22T23:59:00.000Z",
//    "ddkn_m100": "100m_61553_5421",
//    "ddkn_km1": "1km_6155_542",
//    "ddkn_km10": "10km_615_54"
//  },
//  adresse: {
//    "id": "df870b7b-e6a3-49c8-98b0-4da64a82ac0f",
//    "oprettet": "2014-05-23T09:50:40.167Z",
//    "ændret": "2014-05-26T09:55:01.157Z",
//    "ikrafttrædelsesdato": null,
//    "etage": "st",
//    "dør": "th",
//    "adgangsadresseid": "0dd9a7db-c962-4952-b501-4820dadfc4a1"
//  }
//};
//
//var update = {
//  postnummer: {
//    "nr": 8260,
//    "navn": "Opdateret Viby J",
//    "stormodtager": true
//  },
//  vejstykke: {
//    "kode": 2640,
//    "kommunekode": 846,
//    "navn": "Opdateret Bymarken",
//    "adresseringsnavn": "Opdateret Bymarken",
//    "oprettet": "2013-05-27T04:42:32.240Z",
//    "ændret": "2015-05-27T04:42:32.240Z"
//  },
//  adgangsadresse: {
//    "id": "038edf0e-001b-4d9d-a1c7-b71cb354680f",
//    "kommunekode": 100,
//    "vejkode": 200,
//    "husnr": "22B",
//    "supplerendebynavn": "Opdateret Brovad",
//    "postnr": 6000,
//    "oprettet": "2013-05-22T14:56:22.237Z",
//    "ændret": "2015-05-22T15:50:49.437Z",
//    "ikrafttrædelsesdato": "2015-05-22T00:00:00.000Z",
//    "ejerlavkode": 123456,
//    "ejerlavnavn": "Opdateret ejerlavnavn",
//    "matrikelnr": "18b",
//    "esrejendomsnr": 12345,
//    "etrs89koordinat_øst": 542100.00,
//    "etrs89koordinat_nord": 6155300.00,
//    "wgs84koordinat_længde": 9.66850000000000,
//    "wgs84koordinat_bredde": 55.54220000000000,
//    "nøjagtighed": "B",
//    "kilde": 4,
//    "tekniskstandard": "AA",
//    "tekstretning": "100.00",
//    "adressepunktændringsdato": "2015-05-22T23:59:00.000Z",
//    "ddkn_m100": "100m_61553_0000",
//    "ddkn_km1": "1km_6155_000",
//    "ddkn_km10": "10km_615_00"
//  },
//  adresse: {
//    "id": "df870b7b-e6a3-49c8-98b0-4da64a82ac0f",
//    "oprettet": "2013-05-23T09:50:40.167Z",
//    "ændret": "2015-05-26T09:55:01.157Z",
//    "ikrafttrædelsesdato": "2015-05-26T09:55:01.157Z",
//    "etage": "1",
//    "dør": "tv",
//    "adgangsadresseid": "11111111-c962-4952-b501-4820dadfc4a1"
//  }
//};
//
//
//function toSqlModel(datamodelName, apiObject) {
//  return _.reduce(columnMappings[datamodelName], function (memo, mapping) {
//    var sqlColumn = mapping.column || mapping.name;
//    memo[sqlColumn] = apiObject[mapping.name];
//    return memo;
//  }, {});
//}
//describe('ReplikeringsAPI', function() {
//  var client;
//  var transactionDone;
//  beforeEach(function(done) {
//    sqlCommon.withWriteTransaction(process.env.pgEmptyDbUrl, function(err, _client, _transactionDone){
//      if(err) {
//        return done(err);
//      }
//      client = _client;
//      transactionDone = _transactionDone;
//      done();
//    });
//
//  });
//
//  // create, update and delete each object
//  beforeEach(function(done) {
//    Object.keys(columnMappings).forEach(function(datamodelName) {
//      var datamodel = datamodels[datamodelName];
//      var objectToInsert = toSqlModel(datamodelName, insert[datamodelName]);
//      var objectToUpdate = toSqlModel(datamodelName, update[datamodelName]);
//      Q.nfcall(crud.create, client, datamodel, objectToInsert).then(function() {
//        return Q.nfcall(crud.update, client, datamodel, objectToUpdate);
//      }).then(function() {
//        return Q.nfcall(crud.delete, client, datamodel, crud.getKey(objectToUpdate));
//      }).done(done);
//    });
//  });
//
//  Object.keys(columnMappings).forEach(function(datamodelName, index) {
//    describe(format('Replication of %s', datamodelName), function() {
//      it('Should include the created object in the full extract', function(done) {
//        var sekvensnummer = (index * 3) + 1;
//      });
//    });
//  });
//
//  afterEach(function(done) {
//    transactionDone('rollback', function(err) {
//      done(err);
//    });
//  });
//
//});