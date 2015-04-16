"use strict";

var expect = require('chai').expect;
var q = require('q');
var _ = require('underscore');

var datamodels = require('../../crud/datamodel');
var importDarImpl = require('../../darImport/importDarImpl');
var qUtil = require('../../q-util');
var testdb = require('../helpers/testdb');
var testObjects = require('../helpers/testObjects');


//var TIME_1 = testObjects.defaultRegistrering.lower;
var TIME_1_LOCAL = '2011-01-01T13:00:00.123';
var TIME_2 = '2012-01-01T12:00:00.123Z';
var TIME_2_LOCAL = '2012-01-01T13:00:00.123';

q.longStackSupport = true;

var sampleData = {
  adgangspunkt: {
    "id": 1,
    "bkid": "00000000-0000-0000-0000-000000000001",
    "kildekode": 1,
    "kommunenummer": 881,
    "noejagtighedsklasse": "A",
    "placering": 5,
    "retning": 71,
    "revisionsdato": "2014-05-08T22:00:00.000Z",
    "statuskode": 1,
    "tekniskstandard": "TK",
    "esdhreference": "esdhref1",
    "journalnummer": "journalnummer1",
    "oest": 568467.47,
    "nord": 6243403.44
  },
  husnummer: {
    "adgangspunktid": 1,
    "bynavn": null,
    "husnummer": '5B',
    "id": 2,
    "bkid": "00000000-0000-0000-0000-000000000002",
    "ikrafttraedelsesdato": "2012-05-08T22:00:00.000Z",
    "kildekode": 1,
    "postdistrikt": "Frederikssund",
    "postnummer": 3600,
    "statuskode": 1,
    "vejkode": 1,
    "vejnavn": "A C Hansensvej"
  },
  adresse: {
    "id": 3,
    "bkid": "00000000-0000-0000-0000-000000000003",
    "husnummerid": 2,
    "doerbetegnelse": "mf",
    "etagebetegnelse": "2",
    "ikrafttraedelsesdato": "2012-05-08T22:00:00.000Z",
    "kildekode": 1,
    "statuskode": 1,
    "esdhreference": "esdhref2",
    "journalnummer": "journalnummer2"
  }
};

function getDawaContent(client) {
  return qUtil.reduce(['vejstykke', 'adgangsadresse', 'adresse'], function(memo, entityName) {
    var datamodel = datamodels[entityName];
    return client.queryp('SELECT * FROM ' + datamodel.table + ' ORDER BY ' + datamodel.key.join(', '), [])
      .then(function(result) {
        memo[entityName] = result.rows ? result.rows : [];
        console.log('returning ' + JSON.stringify(memo));
        return memo;
      });
  }, {});
}


describe('Inkrementiel opdatering af DAR data', function() {
  var ap = testObjects.generate('bitemporal', sampleData.adgangspunkt, {});
  var hn = testObjects.generate('bitemporal', sampleData.husnummer, {});
  var adresse = testObjects.generate('bitemporal', sampleData.adresse, {});
  var changeset = {
    adgangspunkt: [ap],
    husnummer: [hn],
    adresse: [adresse]
  };
  testdb.withTransactionEach('empty', function(clientFn) {
    it('fetched data are stored in appropriate tables', function() {
      return importDarImpl.internal.storeFetched(clientFn(), changeset).then(function() {
        return qUtil.mapSerial(['fetched_adgangspunkt', 'fetched_husnummer',
        'fetched_adresse'], function(table) {
          return clientFn().queryp('select * from ' + table, []).then(function(result) {
            expect(result.rows).to.have.length(1);
          });
        });
      });
    });

    it('New objects result in entries in create_tables', function () {
      return importDarImpl.internal.computeChangeSets(clientFn(), changeset).then(function () {
        return qUtil.mapSerial(['insert_dar_adgangspunkt', 'insert_dar_husnummer',
          'insert_dar_adresse'], function (table) {
          return clientFn().queryp('select * from ' + table, []).then(function (result) {
            expect(result.rows).to.have.length(1);
          });
        });
      });
    });

    it('Created objects are detected as dirty', function() {
      return importDarImpl.internal.computeChangeSets(clientFn(), changeset)
        .then(function () {
          return importDarImpl.internal.computeDirtyObjects(clientFn());
        }).then(function() {
          return qUtil.mapSerial(['dirty_adgangsadresser', 'dirty_enhedsadresser'], function (table) {
            return clientFn().queryp('select * from ' + table, []).then(function (result) {
              expect(result.rows).to.have.length(1);
            });
          });
        });
    });

    describe('Livscyklus for adressedata', function() {
      it('Når adgangspunkt og husnummer oprettes skal det konverteres til DAWA', function() {
        var ap = testObjects.generate('bitemporal', sampleData.adgangspunkt, {});
        var hn = testObjects.generate('bitemporal', sampleData.husnummer, {});
        var changeSet = {
          adgangspunkt: [_.clone(ap)],
          husnummer: [_.clone(hn)],
          adresse: []
        };
        return importDarImpl.applyDarChanges(clientFn(), changeSet)
          .then(function() {
            return getDawaContent(clientFn());
          })
          .then(function(content) {
            expect(content.adgangsadresse).to.have.length(1);
            var a = content.adgangsadresse[0];
            console.log(JSON.stringify(a));
            expect(a.id).to.equal(hn.bkid);
            expect(a.kommunekode).to.equal(ap.kommunenummer);
            expect(a.vejkode).to.equal(hn.vejkode);
            expect(a.husnr).to.deep.equal(hn.husnummer);
            expect(a.objekttype).to.equal(hn.statuskode);
            expect(a.oprettet).to.equal(TIME_1_LOCAL);
            expect(a.ikraftfra).to.equal('2012-05-09T00:00:00.000');
            expect(a.aendret).to.equal(TIME_1_LOCAL);
            expect(a.adgangspunktid).to.equal(ap.bkid);
            expect(a.etrs89oest).to.equal(ap.oest);
            expect(a.etrs89nord).to.equal(ap.nord);
            expect(a.noejagtighed).to.equal(ap.noejagtighedsklasse);
            expect(a.adgangspunktkilde).to.equal(ap.kildekode);
            expect(a.husnummerkilde).to.equal(hn.kildekode);
            expect(a.placering).to.equal(ap.placering);
            expect(a.tekniskstandard).to.equal(ap.tekniskstandard);
            expect(a.tekstretning).to.equal(ap.retning);
            expect(a.adressepunktaendringsdato).to.equal('2014-05-09T00:00:00.000');
            expect(a.esdhreference).to.equal(ap.esdhreference);
            expect(a.journalnummer).to.equal(ap.journalnummer);
          });
      });
      it('Når et husnummer opdateres skal ændringen afspejles i DAWA', function() {
        var ap = testObjects.generate('bitemporal', sampleData.adgangspunkt, {});
        var hn = testObjects.generate('bitemporal', sampleData.husnummer, {});

        var t1_changeset = {
          adgangspunkt: [_.clone(ap)],
          husnummer: [_.clone(hn)],
          adresse: []
        };
        var hnExpired = _.clone(hn);
        hnExpired.registreringslut = TIME_2;
        var hnHistoric = testObjects.generate('bitemporal', sampleData.husnummer, {});
        hnHistoric.registreringstart = TIME_2;
        hnHistoric.virkningslut = TIME_2;
        var hnUpdated = testObjects.generate('bitemporal', sampleData.husnummer, {
          registreringstart: TIME_2,
          virkningstart: TIME_2,
          husnummer: '13'
        });
        var t2_changeset = {
          adgangspunkt: [],
          husnummer: [hnExpired, hnHistoric, hnUpdated],
          adresse: []
        };
        return importDarImpl.applyDarChanges(clientFn(), t1_changeset)
          .then(function() {
            return importDarImpl.applyDarChanges(clientFn(), t2_changeset);
          })
          .then(function() {
            return getDawaContent(clientFn());
          })
          .then(function(dawaContent) {
            expect(dawaContent.adgangsadresse).to.have.length(1);
            var a = dawaContent.adgangsadresse[0];
            expect(a.husnr).to.equal('13');
            expect(a.oprettet).to.equal(TIME_1_LOCAL);
            expect(a.aendret).to.equal(TIME_2_LOCAL);
          });
      });
      it('Når et adgangspunkt ændres skal ændringen afspejles i DAWA', function() {
        var ap = testObjects.generate('bitemporal', sampleData.adgangspunkt, {});
        var hn = testObjects.generate('bitemporal', sampleData.husnummer, {});

        var t1_changeset = {
          adgangspunkt: [_.clone(ap)],
          husnummer: [_.clone(hn)],
          adresse: []
        };
        var apExpired = _.clone(ap);
        apExpired.registreringslut = TIME_2;
        var apHistoric = testObjects.generate('bitemporal', sampleData.adgangspunkt, {});
        apHistoric.virkningslut = TIME_2;
        var apUpdated = testObjects.generate('bitemporal', sampleData.adgangspunkt, {
          registreringstart: TIME_2,
          virkningstart: TIME_2,
          tekniskstandard: 'TN'
        });
        var t2_changeset = {
          adgangspunkt: [apExpired, apHistoric, apUpdated],
          husnummer: [],
          adresse: []
        };
        return importDarImpl.applyDarChanges(clientFn(), t1_changeset)
          .then(function() {
            return importDarImpl.applyDarChanges(clientFn(), t2_changeset);
          })
          .then(function() {
            return getDawaContent(clientFn());
          })
          .then(function(dawaContent) {
            expect(dawaContent.adgangsadresse).to.have.length(1);
            var a = dawaContent.adgangsadresse[0];
            expect(a.tekniskstandard).to.equal('TN');
            expect(a.oprettet).to.equal(TIME_1_LOCAL);
            expect(a.aendret).to.equal(TIME_2_LOCAL);
          });
      });
      it('Når et husnummer nedlægges (statuskode 2) skal det slettes i DAWA', function() {
        var ap = testObjects.generate('bitemporal', sampleData.adgangspunkt, {});
        var hn = testObjects.generate('bitemporal', sampleData.husnummer, {});

        var t1_changeset = {
          adgangspunkt: [_.clone(ap)],
          husnummer: [_.clone(hn)],
          adresse: []
        };
        var hnExpired = _.clone(hn);
        hnExpired.registreringslut = TIME_2;
        var hnHistoric = testObjects.generate('bitemporal', sampleData.husnummer, {});
        hnHistoric.virkningslut = TIME_2;
        var hnUpdated = testObjects.generate('bitemporal', sampleData.husnummer, {
          registreringstart: TIME_2,
          virkningstart: TIME_2,
          statuskode: 2
        });
        var t2_changeset = {
          adgangspunkt: [],
          husnummer: [hnExpired, hnHistoric, hnUpdated],
          adresse: []
        };
        return importDarImpl.applyDarChanges(clientFn(), t1_changeset)
          .then(function() {
            return importDarImpl.applyDarChanges(clientFn(), t2_changeset);
          })
          .then(function() {
            return getDawaContent(clientFn());
          })
          .then(function(dawaContent) {
            expect(dawaContent.adgangsadresse).to.have.length(0);
          });
      });
      it('Når en adresse oprettes  i DAR oprettes den også i DAWA', function() {
        var ap = testObjects.generate('bitemporal', sampleData.adgangspunkt, {});
        var hn = testObjects.generate('bitemporal', sampleData.husnummer, {});
        var ad = testObjects.generate('bitemporal', sampleData.adresse, {});
        var changeset = {
          adgangspunkt: [_.clone(ap)],
          husnummer: [_.clone(hn)],
          adresse: [_.clone(ad)]
        };
        return importDarImpl.applyDarChanges(clientFn(), changeset)
          .then(function() {
            return getDawaContent(clientFn());
          })
          .then(function(dawaContent) {
            expect(dawaContent.adresse).to.have.length(1);
            var e = dawaContent.adresse[0];
            expect(e.id).to.equal(ad.bkid);
            expect(e.adgangsadresseid).to.equal(sampleData.husnummer.bkid);
            expect(e.objekttype).to.equal(ad.statuskode);
            expect(e.oprettet).to.equal(TIME_1_LOCAL);
            expect(e.aendret).to.equal(TIME_1_LOCAL);
            expect(e.etage).to.equal(ad.etagebetegnelse);
            expect(e.doer).to.equal(ad.doerbetegnelse);
            expect(e.kilde).to.equal(ad.kildekode);
            expect(e.esdhreference).to.equal(ad.esdhreference);
            expect(e.journalnummer).to.equal(ad.journalnummer);
          });
      });
    });

  });
});