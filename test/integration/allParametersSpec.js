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
  },
  postnummer: {
    nr: {
      values: ['6100'],
      verifier: function(postnummer, nr) {
        return postnummer.nr === parseInt(nr, 10);
      }
    },
    navn: {
      values: ['Slagelse'],
      verifier: function(postnummer, navn) {
        return postnummer.navn === navn;
      }
    },
    kommune: {
      values: ['461', '0461'],
      verifier: function(postnummer, kommunekode) {
        return _.some(postnummer.kommuner, function(kommune) {
          return kommune.kode === parseInt(kommunekode, 10);
        });
      }
    }
  },
  supplerendeBynavn: {
    navn: {
      values: ['Elmelund'],
      verifier: function(supplerendeBynavn, navn) {
        return supplerendeBynavn.navn === navn;
      }
    },
    kommunekode: {
      values: ['461', '0461'],
      verifier: function(supplerendeBynavn, kommunekode) {
        return _.some(supplerendeBynavn.kommuner, function(kommune) {
          return kommune.kode === parseInt(kommunekode, 10);
        });
      }
    },
    postnr: {
      values: ['5200'],
      verifier: function(supplerendeBynavn, nr) {
        return _.some(supplerendeBynavn.postnumre, function(postnummer){
          return postnummer.nr === parseInt(nr);
        });
      }
    }
  },
  kommune: {
    kode: {
      values: ['461', '0461'],
      verifier: function(kommune, kode) {
        return kommune.kode === parseInt(kode, 10);
      }
    },
    navn: {
      values: ['Aarhus'],
      verifier: function(kommune, navn) {
        return kommune.navn === navn;
      }
    }
  },
  adgangsadresse: {
    id: {
      values: ['0a3f507b-b8f7-32b8-e044-0003ba298018'],
      verifier: function (adr, id) {
        return adr.id === id;
      }
    },
    vejkode: {
      values: ['1010'],
      verifier: function(adr, vejkode) {
        return adr.vejstykke.kode === parseInt(vejkode, 10);
      }
    },
    vejnavn: {
      values: ['Allégade'],
      verifier: function(adr, vejnavn) {
        return adr.vejstykke.navn === vejnavn;
      }

    },
    husnr: {
      values: ['70B'],
      verifier: function(adr, husnr) {
        return adr.husnr === husnr;
      }
    },
    supplerendebynavn: {
      values: ['Rynkeby'],
      verifier: function(adr, supplerendeBynavn) {
        return adr.supplerendebynavn === supplerendeBynavn;
      }
    },
    postnr: {
      values: ['4622'],
      verifier: function(adr, nr) {
        return adr.postnummer.nr === parseInt(nr, 10);
      }
    },
    kommunekode: {
      values: ['461', '0461'],
      verifier: function(adr, kode) {
        return adr.kommune.kode === parseInt(kode, 10);
      }
    },
    ejerlavkode: {
      values: ['02003851', '2003851'],
      verifier: function(adr, ejerlavkode) {
        return adr.ejerlav.kode === parseInt(ejerlavkode, 10);
      }
    },
    matrikelnr: {
      values: ['302by'],
      verifier: function(adr, matrikelnr) {
        return adr.matrikelnr === matrikelnr;
      }
    },
    polygon: {
      values: [],
      verifier: function(adr, polygon) {

      }
    }
  },
  adresse: {
    id: {
      values: ['04d92d98-a576-4cc0-abc9-2d059b8285ff'],
      verifier: function(adr, id) {
        return adr.id === id;
      }
    },
    etage: {
      values: ['kl', '1'],
      verifier: function(adr, etage) {
        return adr.etage === etage;
      }
    },
    dør: {
      values: ['tv', '1'],
      verifier: function(adr, dør) {
        return adr.dør === dør;
      }
    },
    adgangsadresseid: {
      values: ['0a3f507b-b8f7-32b8-e044-0003ba298018'],
      verifier: function (adr, id) {
        return adr.adgangsadresse.id === id;
      }
    },
    vejkode: {
      values: ['1010'],
      verifier: function(adr, vejkode) {
        return adr.adgangsadresse.vejstykke.kode === parseInt(vejkode, 10);
      }
    },
    vejnavn: {
      values: ['Allégade'],
      verifier: function(adr, vejnavn) {
        return adr.adgangsadresse.vejstykke.navn === vejnavn;
      }

    },
    husnr: {
      values: ['70B'],
      verifier: function(adr, husnr) {
        return adr.adgangsadresse.husnr === husnr;
      }
    },
    supplerendebynavn: {
      values: ['Rynkeby'],
      verifier: function(adr, supplerendeBynavn) {
        return adr.adgangsadresse.supplerendebynavn === supplerendeBynavn;
      }
    },
    postnr: {
      values: ['4622'],
      verifier: function(adr, nr) {
        return adr.adgangsadresse.postnummer.nr === parseInt(nr, 10);
      }
    },
    kommunekode: {
      values: ['461', '0461'],
      verifier: function(adr, kode) {
        return adr.adgangsadresse.kommune.kode === parseInt(kode, 10);
      }
    },
    ejerlavkode: {
      values: ['02003851', '2003851'],
      verifier: function(adr, ejerlavkode) {
        return adr.adgangsadresse.ejerlav.kode === parseInt(ejerlavkode, 10);
      }
    },
    matrikelnr: {
      values: ['302by'],
      verifier: function(adr, matrikelnr) {
        return adr.adgangsadresse.matrikelnr === matrikelnr;
      }
    },
    polygon: {
      values: [],
      verifier: function(adr, polygon) {

      }
    }
  }
};

describe('Alle specificerede parametre skal virke', function() {
  _.keys(sampleParameters).forEach(function(specName) {
    describe('Alle parametre for ' + specName + ' skal virke', function() {
      it('Alle almindelige parametre for ' + specName + ' bliver testet', function() {
        var specifiedParameterNames = _.pluck(spec.parameters, 'name');
        var testedParameterNames = _.keys(sampleParameters[specName]);
        expect(_.difference(specifiedParameterNames, testedParameterNames).length).toBe(0);
      });
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
              dbapi.query(client, spec, { specified: parseResult.params }, {limit: 100}, function(err, rows) {
                transactionDone();
                expect(err).toBeFalsy();
                expect(rows.length).toBeGreaterThan(0);
                rows.forEach(function(row) {
                  var json = spec.mappers.json(row);
                  var verifyResult = verify(json, sampleValue);
                  expect(verifyResult).toBe(true);
                  if(!verifyResult) {
                    console.log(JSON.stringify(json));
                  }
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