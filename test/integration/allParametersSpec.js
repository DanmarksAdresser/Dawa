"use strict";

var apiSpec = require('../../apiSpec');
var _ = require('underscore');
var parameterParsing = require('../../parameterParsing');
var dbapi = require('../../dbapi');

var sampleParameters = {
  vejstykke: {
    kode: {
      values: ['522', '0522'],
      verifier: function(vejstykke, kode) {
        return vejstykke.kode === parseInt(kode, 10);
      }
    },

    kommunekode: {
      values: ['269', '0269'],
      verifier: function(vejstykke, kommunekode) {
        return vejstykke.kommune.kode === parseInt(kommunekode, 10);
      }
    },
    navn: {
      values: ['Jens Nielsens Vej'],
      verifier: function(vejstykke, navn) {
        return vejstykke.navn === navn;
      }
    },
    postnr: {
      values: ['6100'],
      verifier: function(vejstykke, nr) {
        return _.some(vejstykke.postnumre, function(postnummer) {
          return postnummer.nr === parseInt(nr, 10);
        });
      }
    }
  },
  vejnavn: {
    navn: {
      values: ['Allégade', 'Birkede Brovej'],
      verifier: function(vejnavn, navn) {
        return vejnavn.navn === navn;
      }
    },
    postnr: {
      values: ['6100'],
      verifier: function(vejnavn, nr) {
        return _.some(vejnavn.postnumre, function(postnummer) {
          return postnummer.nr === parseInt(nr, 10);
        });
      }
    },
    kommunekode: {
      values: ['461', '0461'],
      verifier: function(vejnavn, kommunekode) {
        return _.some(vejnavn.kommuner, function(kommune){
          return kommune.kode === parseInt(kommunekode, 10);
        });
      }
    }
  }
};

describe('Alle specificerede parametre skal virke', function() {
  _.keys(sampleParameters).forEach(function(specName) {
    describe('Alle parametre for ' + specName + ' skal virke', function() {
      var spec = apiSpec[specName];
      _.each(sampleParameters[specName], function(sample, paramName) {
        var verify = sample.verifier;
        sample.values.forEach(function(sampleValue) {
          it('Parameteren ' + paramName + '=' + sampleValue + ' skal virke', function(specDone) {
            var rawQueryParams = {};
            rawQueryParams[paramName] = sampleValue;
            var parseResult = parameterParsing.parseParameters(rawQueryParams,  _.indexBy(spec.parameters, 'name'));
            expect(parseResult.errors.length).toBe(0);
            dbapi.withTransaction(function(err, client, transactionDone) {
              if(err) throw 'unable to open connection';
              dbapi.query(client, spec, { specified: parseResult.params }, {}, function(err, rows) {
                transactionDone();
                expect(err).toBeFalsy();
                expect(rows.length).toBeGreaterThan(0);
                rows.forEach(function(row) {
                  var json = spec.mappers.json(row);
                  expect(verify(json,sampleValue)).toBe(true);
                });
                specDone();
              });
            });
          });
        });
      });
    });
  });
});