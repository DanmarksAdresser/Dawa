"use strict";

var handleBbrEvent = require('../../bbr/eventImporter/handleBbrEvent');
var dbapi = require('../../dbapi');
var datamodels = require('../../crud/datamodel');
var crud = require('../../crud/crud');
var _ = require('underscore');

describe('Håndtering af BBR events', function() {
  describe('supplerendebynavn events', function() {
    var event = {
      "type": "supplerendebynavn",
      "sekvensnummer": 1005,
      "lokaltsekvensnummer": 205,
      "tidspunkt": "2000-02-05T12:00:00+00:00",
      "data": {
        "kommunekode": 420,
        "vejkode": 481,
        "intervaller": [{
          "husnrFra": "4",
          "husnrTil": "8",
          "side": "lige",
          "navn": "Østby"
        }, {
          "husnrFra": "9",
          husnrTil: "15B",
          side: 'ulige',
          navn: 'Vestby'
        }]
      }
    };
    var transactionDone;
    var resultingAdresser;

    beforeEach(function(done) {
      dbapi.withWriteTransaction(function(err, client, tDone) {
        if(err) {
          throw err;
        }
        transactionDone = tDone;
        handleBbrEvent(client, event, function(err) {
          if(err) {
            throw err;
          }
          crud.query(client, datamodels.adgangsadresse, {
            kommunekode: 420,
            vejkode: 481
          }, function(err, adresser) {
            if(err) {
              throw err;
            }
            resultingAdresser = adresser;
            done();
          });
        });
      });
    });
    var husnumreILigeInterval = ['4', '6', '8'];
    var husnumreIUligeInterval = ['9', '11', '13', '15', '15B'];
    it('Skal sætte supplerende bynavn (lige husnummerinterval)', function() {
      var adresserILigeInterval = _.filter(resultingAdresser, function(adresse) {
        return _.contains(husnumreILigeInterval, adresse.husnr);
      });
      expect(adresserILigeInterval.length).toBe(husnumreILigeInterval.length);
      adresserILigeInterval.forEach(function(adresse) {
        expect(adresse.supplerendebynavn).toBe('Østby');
      });
    });
    it('Skal sætte supplerende bynavn (ulige husnummerinterval)', function() {
      var adresserIUligeInterval = _.filter(resultingAdresser, function(adresse) {
        return _.contains(husnumreIUligeInterval, adresse.husnr);
      });
      expect(adresserIUligeInterval.length).toBe(husnumreIUligeInterval.length);
      adresserIUligeInterval.forEach(function(adresse) {
        expect(adresse.supplerendebynavn).toBe('Vestby');
      });
    });
    it('Skal sætte supplerende bynavn på alle andre adresser til null', function() {
      var adresserUdenforInterval = _.reject(resultingAdresser, function(adresse) {
        return _.contains(husnumreILigeInterval.concat(husnumreIUligeInterval), adresse.husnr);
      });
      expect(adresserUdenforInterval.length).toBe(15);
      adresserUdenforInterval.forEach(function(adresse) {
        expect(adresse.supplerendebynavn).toBeNull();
      });
    });
    afterEach(function(done) {
      transactionDone(null, done);
    });
  });
  describe('vejnavn events', function() {
    var createEvent = {
      type: 'vejnavn',
      sekvensnummer: 1,
      aendringstype: 'oprettelse',
      tidspunkt: '2000-02-05T12:00:00+00:00',
      data: {
        kommunekode: 999,
        vejkode: 9999,
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
        kommunekode: 999,
        vejkode: 9999,
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
        kommunekode: 999,
        vejkode: 9999,
        navn: 'Einsteins gade',
        adresseringsnavn: 'Einsteins gade'
      }
    };
    it('Ved modtagelse af en oprettelse event oprettes vejstykket', function(done) {
      dbapi.withRollbackTransaction(function(err, client, transactionDone) {
        handleBbrEvent(client, createEvent, function(err) {
          if(err) {
            throw err;
          }
          crud.query(client, datamodels.vejstykke, {
            kommunekode: 999,
            kode: 9999
          }, function (err, queryResult) {
            if(err) {
              throw err;
            }
            expect(queryResult.length).toBe(1);
            var created = queryResult[0];
            expect(created.kommunekode).toEqual(999);
            expect(created.kode).toEqual(9999);
            expect(created.vejnavn).toEqual('Niels Bohrs Alle');
            transactionDone();
            done();
          });
        });
      });
    });
    it('Ved modtagelse af en aendring event udføres en update', function(done) {
      dbapi.withRollbackTransaction(function(err, client, transactionDone) {
        handleBbrEvent(client, createEvent, function(err) {
          if(err) {
            throw err;
          }
          handleBbrEvent(client, updateEvent, function(err) {
            if(err) {
              throw err;
            }
            crud.query(client, datamodels.vejstykke, {
              kommunekode: 999,
              kode: 9999
            }, function (err, queryResult) {
              if(err) {
                throw err;
              }
              expect(queryResult.length).toBe(1);
              var updated = queryResult[0];
              expect(updated.vejnavn).toEqual('Einsteins gade');
              transactionDone();
              done();
            });
          });
        });
      });
    });
    it('Ved modtagelse af en nedlaeggelse event udføres en delete', function(done) {
      dbapi.withRollbackTransaction(function(err, client, transactionDone) {
        handleBbrEvent(client, createEvent, function(err) {
          if(err) {
            throw err;
          }
          handleBbrEvent(client, deleteEvent, function(err) {
            if(err) {
              throw err;
            }
            crud.query(client, datamodels.vejstykke, {
              kommunekode: 999,
              kode: 9999
            }, function (err, queryResult) {
              if(err) {
                throw err;
              }
              expect(queryResult.length).toBe(0);
              transactionDone();
              done();
            });
          });
        });
      });
    });
  });
});