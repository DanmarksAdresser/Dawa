"use strict";
var request = require("request");
var MongoClient = require('mongodb').MongoClient;
var postnummerCrud = require('../../crud').postnummer;

var baseUrl = 'http://localhost:3000/api';
var mongoTestUrl = 'mongodb://localhost/dawatest';



describe('Postnumre', function () {
  var db;
  beforeEach(function(done) {
    MongoClient.connect(mongoTestUrl,function (err, database) {
      if (err) {
        throw new Error(err);
      }
      db = database;
      db.collection('postnumre', function(err, collection) {
        collection.remove({}, {}, function(err) {
          done();
        });
      });
    });
  });
  afterEach(function() {
    if(db) {
      db.close();
    }
  });
  it('Skal kunne tage imod en postnummeroprettelse fra BBR og oprette postnummeret i databasen', function (done) {
    request.put({
      url: baseUrl + '/postnummerhaendelse/oprettelse',
      json: {
        Loebenummer: '1',
        tidspunkt: '2012-02-11T04:05:28+01:00',
        postnummer: {
          version: '2012-02-11T04:05:28+01:00',
          nr: '8260',
          navn: 'Viby J'
        }
      }
    }, function (error, response, body) {
      if (error) {
        throw new Error(error);
      }
      expect(response.statusCode).toBe(200);
      postnummerCrud.get(db, '8260', function(err, postnummer) {
        expect(postnummer).toBeDefined();
        expect(postnummer.nr).toBe('8260');
        expect(postnummer.navn).toBe('Viby J');
        done();
      });
    });
  });
});
