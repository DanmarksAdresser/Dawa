"use strict";

var async = require('async');
var expect = require('chai').expect;
var q = require('q');
var _ = require('underscore');

var bbrEvents = require('../../bbr/eventImporter/bbrEvents');
var datamodels = require('../../crud/datamodel');
var crud = require('../../crud/crud');
var testdb = require('../helpers/testdb');

var handleBbrEvent = bbrEvents.internal.applyBbrEvent;

describe('Håndtering af BBR events', function() {
  describe('supplerendebynavn events', function() {
    var events = [{
      "type": "supplerendebynavn",
      "sekvensnummer": 1005,
      "lokaltsekvensnummer": 205,
      "tidspunkt": "2000-02-05T12:00:00+00:00",
      "data": {
        "kommunekode": 461,
        "vejkode": 4194,
        "side": "lige",
        "intervaller": [{
          "husnrFra": "190",
          "husnrTil": "194",
          "navn": "Østby"
        }]
      }
    }, {
      "type": "supplerendebynavn",
      "sekvensnummer": 1006,
      "lokaltsekvensnummer": 206,
      "tidspunkt": "2000-02-05T12:00:00+00:00",
      "data": {
        "kommunekode": 461,
        "vejkode": 4194,
        "side": "ulige",
        "intervaller": [{
          "husnrFra": "105",
          husnrTil: "107",
          navn: 'Vestby'
        }, {
          "husnrFra": "101",
          husnrTil: "103",
          navn: 'Vestby'
        }]
      }
    }];
    var resultingAdresser;

    function handleBbrEvents(client, events, cb) {
      async.eachSeries(events, function(event, cb) {
        handleBbrEvent(client, event, cb);
      }, cb);
    }

    before(function () {
      return testdb.withTransaction('test', 'ROLLBACK', function (client) {
        return q.nfcall(handleBbrEvents, client, events)
          .then(function () {
            return q.nfcall(crud.query, client, datamodels.adgangsadresse, {
              kommunekode: 461,
              vejkode: 4194
            });
          })
          .then(function (adresser) {
            resultingAdresser = adresser;
          });
      });
    });
    var husnumreILigeInterval = ['190', '192', '194'];
    var husnumreIUligeInterval = ['101', '103', '105', '107'];
    it('Skal sætte supplerende bynavn (lige husnummerinterval)', function() {
      var adresserILigeInterval = _.filter(resultingAdresser, function(adresse) {
        return _.contains(husnumreILigeInterval, adresse.husnr);
      });
      expect(adresserILigeInterval.length).to.equal(husnumreILigeInterval.length);
      adresserILigeInterval.forEach(function(adresse) {
        expect(adresse.supplerendebynavn).to.equal('Østby');
      });
    });
    it('Skal sætte supplerende bynavn (ulige husnummerinterval)', function() {
      var adresserIUligeInterval = _.filter(resultingAdresser, function(adresse) {
        return _.contains(husnumreIUligeInterval, adresse.husnr);
      });
      expect(adresserIUligeInterval.length).to.equal(husnumreIUligeInterval.length);
      adresserIUligeInterval.forEach(function(adresse) {
        expect(adresse.supplerendebynavn).to.equal('Vestby');
      });
    });
    it('Skal sætte supplerende bynavn på alle andre adresser til null', function() {
      var adresserUdenforInterval = _.reject(resultingAdresser, function(adresse) {
        return _.contains(husnumreILigeInterval.concat(husnumreIUligeInterval), adresse.husnr);
      });
      expect(adresserUdenforInterval.length).to.equal(35);
      adresserUdenforInterval.forEach(function(adresse) {
        expect(adresse.supplerendebynavn).to.be.null;
      });
    });
  });
  describe('vejnavn events', function() {
    var createEvent = {
      type: 'vejnavn',
      sekvensnummer: 1,
      aendringstype: 'oprettelse',
      tidspunkt: '2000-02-05T12:00:00+00:00',
      data: {
        kommunekode: 99,
        vejkode: 9899,
        navn: 'Niels Bohrs Alle',
        adresseringsnavn: 'Niels Bohrs Alle'
      }
    };
    var updateEvent = {
      type: 'vejnavn',
      sekvensnummer: 2,
      aendringstype: 'aendring',
      tidspunkt: '2000-02-05T12:00:00+00:00',
      data: {
        kommunekode: 99,
        vejkode: 9899,
        navn: 'Einsteins gade',
        adresseringsnavn: 'Einsteins gade'
      }
    };

    var deleteEvent = {
      type: 'vejnavn',
      sekvensnummer: 3,
      aendringstype: 'nedlaeggelse',
      tidspunkt: '2000-02-05T12:00:00+00:00',
      data: {
        kommunekode: 99,
        vejkode: 9899,
        navn: 'Einsteins gade',
        adresseringsnavn: 'Einsteins gade'
      }
    };

    // this event will be filtered because vejkode >= 9900
    var filteredEvent = {
      type: 'vejnavn',
      sekvensnummer: 1,
      aendringstype: 'oprettelse',
      tidspunkt: '2000-02-05T12:00:00+00:00',
      data: {
        kommunekode: 99,
        vejkode: 9999,
        navn: 'Niels Bohrs Alle',
        adresseringsnavn: 'Niels Bohrs Alle'
      }
    };

    it('Ved modtagelse af en oprettelse event oprettes vejstykket', function () {
      return testdb.withTransaction('test', 'ROLLBACK', function (client) {
        return q.nfcall(handleBbrEvent, client, createEvent)
          .then(function () {
            return q.nfcall(crud.query, client, datamodels.vejstykke, {
              kommunekode: 99,
              kode: 9899
            });
          })
          .then(function (queryResult) {
            expect(queryResult.length).to.equal(1);
            var created = queryResult[0];
            expect(created.kommunekode).to.deep.equal(99);
            expect(created.kode).to.deep.equal(9899);
            expect(created.vejnavn).to.deep.equal('Niels Bohrs Alle');
          });
      });
    });
    it('Ved modtagelse af en aendring event udføres en update', function () {
      return testdb.withTransaction('test', 'ROLLBACK', function (client) {
        return q.nfcall(handleBbrEvent, client, createEvent)
          .then(function () {
            return q.nfcall(handleBbrEvent.client, updateEvent);
          })
          .then(function () {
            return q.nfcall(crud.query, client, datamodels.vejstykke, {
              kommunekode: 99,
              kode: 9899
            });
          })
          .then(function (queryResult) {
            expect(queryResult.length).to.equal(1);
            var updated = queryResult[0];
            expect(updated.vejnavn).to.deep.equal('Einsteins gade');
          });
      });
    });

    it('Ved modtagelse af en nedlaeggelse event udføres en delete', function () {
      return testdb.withTransaction('test', 'ROLLBACK', function (client) {
        return q.nfcall(handleBbrEvent, client, createEvent)
          .then(function () {
            return q.nfcall(handleBbrEvent, client, deleteEvent);
          })
          .then(function () {
            return q.nfcall(crud.query, client, datamodels.vejstykke, {
              kommunekode: 99,
              kode: 9899
            });
          })
          .then(function (queryResult) {
            expect(queryResult.length).to.equal(0);
          });
      });
    });

    it('Ved modtagelse af en vejnavn event hvor kode  >= 9900 ignoreres den', function () {
      return testdb.withTransaction('test', 'ROLLBACK', function (client) {
        return q.nfcall(handleBbrEvent, client, filteredEvent)
          .then(function () {
            return q.nfcall(crud.query, client, datamodels.vejstykke, {
              kommunekode: 99,
              kode: filteredEvent.data.vejkode
            });
          })
          .then(function (queryResult) {
            expect(queryResult.length).to.equal(0);
          });
      });
    });
  });
});
