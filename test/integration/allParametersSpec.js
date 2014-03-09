"use strict";

var apiSpec = require('../../apiSpec');
var apiSpecUtil = require('../../apiSpecUtil');
var _ = require('underscore');
var parameterParsing = require('../../parameterParsing');
var dbapi = require('../../dbapi');
var jsonRepresentations = require('../../apiSpecification/jsonRepresentations');

var kode4String = require('../../apiSpecification/util').kode4String;

var sampleParameters = {
  vejstykke: {
    kode: {
      values: ['522', '0522'],
      verifier: function(vejstykke, kode) {
        return vejstykke.kode === kode4String(kode);
      }
    },

    kommunekode: {
      values: ['269', '0269'],
      verifier: function(vejstykke, kommunekode) {
        return vejstykke.kommune.kode === kode4String(kommunekode);
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
          return postnummer.nr === nr;
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
          return postnummer.nr === nr;
        });
      }
    },
    kommunekode: {
      values: ['461', '0461'],
      verifier: function(vejnavn, kommunekode) {
        return _.some(vejnavn.kommuner, function(kommune){
          return kommune.kode === kode4String(kommunekode);
        });
      }
    }
  },
  postnummer: {
    nr: {
      values: ['6100'],
      verifier: function(postnummer, nr) {
        return postnummer.nr === nr;
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
          return kommune.kode === kode4String(kommunekode);
        });
      }
    }
  },
  supplerendebynavn: {
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
          return kommune.kode === kode4String(kommunekode);
        });
      }
    },
    postnr: {
      values: ['5200'],
      verifier: function(supplerendeBynavn, nr) {
        return _.some(supplerendeBynavn.postnumre, function(postnummer){
          return postnummer.nr === nr;
        });
      }
    }
  },
  kommune: {
    kode: {
      values: ['461', '0461'],
      verifier: function(kommune, kode) {
        return kommune.kode === kode4String(kode);
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
        return adr.vejstykke.kode === kode4String(vejkode);
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
        return adr.postnummer.nr === nr;
      }
    },
    kommunekode: {
      values: ['461', '0461'],
      verifier: function(adr, kode) {
        return adr.kommune.kode === kode4String(kode);
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
    esrejendomsnr: {
      values: ['189180'],
      verifier: function(adr, esrejendomsnr) {
        return adr.esrejendomsnr === esrejendomsnr;
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
        return adr.adgangsadresse.vejstykke.kode === kode4String(vejkode);
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
        return adr.adgangsadresse.postnummer.nr === nr;
      }
    },
    kommunekode: {
      values: ['461', '0461'],
      verifier: function(adr, kode) {
        return adr.adgangsadresse.kommune.kode === kode4String(kode);
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
    esrejendomsnr: {
      values: ['189180'],
      verifier: function(adr, esrejendomsnr) {
        return adr.adgangsadresse.esrejendomsnr === esrejendomsnr;
      }
    }
  }
};

describe('Alle propertyFilter parametre skal virke', function() {
  _.keys(sampleParameters).forEach(function(specName) {
    var spec = apiSpec[specName];
    var propertyFilterParameters = spec.parameterGroups.propertyFilter.parameters;
    describe('Alle parametre for ' + specName + ' skal virke', function() {
      it('Alle almindelige parametre for ' + specName + ' bliver testet', function() {
        var specifiedParameterNames = _.pluck(propertyFilterParameters, 'name');
        var testedParameterNames = _.keys(sampleParameters[specName]);
        expect(_.difference(specifiedParameterNames, testedParameterNames)).toEqual([]);
      });
      _.each(sampleParameters[specName], function(sample, paramName) {
        var verify = sample.verifier;
        sample.values.forEach(function(sampleValue) {
          it('Parameteren ' + paramName + '=' + sampleValue + ' skal virke', function(specDone) {
            var rawQueryParams = {};
            rawQueryParams[paramName] = sampleValue;
            var parseResult = parameterParsing.parseParameters(rawQueryParams,  _.indexBy(propertyFilterParameters, 'name'));
            expect(parseResult.errors.length).toBe(0);
            var sqlParts = apiSpecUtil.createSqlParts(spec,
              {propertyFilter: spec.parameterGroups.propertyFilter},
              parseResult.params,
              jsonRepresentations[spec.model.name].fields || _.pluck(spec.fields, 'name'));
            sqlParts.limit = 100;
            dbapi.withReadonlyTransaction(function(err, client, transactionDone) {
              if(err) throw 'unable to open connection';
              dbapi.query(client, sqlParts, function(err, rows) {
                transactionDone();
                expect(err).toBeFalsy();
                expect(rows.length).toBeGreaterThan(0);
                rows.forEach(function(row) {
                  var json = spec.mappers.json(row, {baseUrl: "BASE_URL"});
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