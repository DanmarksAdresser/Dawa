"use strict";

/**
 * Tests all SQL based query parameters
 */

var expect = require('chai').expect;
var _ = require('underscore');

var dbapi = require('../../dbapi');
var kode4String = require('../../apiSpecification/util').kode4String;
var parameterParsing = require('../../parameterParsing');
var registry = require('../../apiSpecification/registry');
var commonParameters = require('../../apiSpecification/common/commonParameters');
require('../../apiSpecification/allSpecs');

function multiVerifier(verifierFn) {
  return function(object, paramString) {
    var values = paramString.split('|');
    return values.some(function(value) {
      return verifierFn(object, value);
    });
  };
}

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
      values: ['Strandmarken'],
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
      values: ['Birkede Brovej'],
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
        return _.some(vejnavn.kommuner, function(kommune) {
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
    kommunekode: {
      values: ['461', '0461'],
      verifier: function(postnummer, kommunekode) {
        return _.some(postnummer.kommuner, function(kommune) {
          return kommune.kode === kode4String(kommunekode);
        });
      }
    },
    stormodtagere: {
      values: ['true', 'false'],
      verifier: function(postnummer, paramVal) {
        return paramVal ? true : postnummer.stormodtageradresser === null;
      }
    }
  },
  supplerendebynavn: {
    navn: {
      values: ['Skallebølle'],
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
        return _.some(supplerendeBynavn.postnumre, function(postnummer) {
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
      values: ['0a3f507b-b8ea-32b8-e044-0003ba298018'],
      verifier: function(adr, id) {
        return adr.id === id;
      }
    },
    status: {
      values: ['1'],
      verifier: function(adr, status) {
        return adr.status === parseInt(status, 10);
      }
    },
    vejkode: {
      values: ['1010'],
      verifier: function(adr, vejkode) {
        return adr.vejstykke.kode === kode4String(vejkode);
      }
    },
    vejnavn: {
      values: ['Birkede Brovej'],
      verifier: function(adr, vejnavn) {
        return adr.vejstykke.navn === vejnavn;
      }

    },
    husnr: {
      values: ['130A'],
      verifier: function(adr, husnr) {
        return adr.husnr === husnr;
      }
    },
    supplerendebynavn: {
      values: ['Kerte'],
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
    nøjagtighed: {
      values: ['A'],
      verifier: function(adr, nøjagtighed) {
        return adr.adgangspunkt.nøjagtighed === nøjagtighed;
      }
    },
    kommunekode: {
      values: ['461', '0461'],
      verifier: function(adr, kode) {
        return adr.kommune.kode === kode4String(kode);
      }
    },
    regionskode: {
      values: ['099'],
      verifier: function(adr, kode) {
        return adr.region.kode === kode4String(kode);
      }
    },
    sognekode: {
      values: ['099'],
      verifier: function(adr, kode) {
        return adr.sogn.kode === kode4String(kode);
      }
    },
    politikredskode: {
      values: ['099'],
      verifier: function(adr, kode) {
        return adr.politikreds.kode === kode4String(kode);
      }
    },
    retskredskode: {
      values: ['099'],
      verifier: function(adr, kode) {
        return adr.retskreds.kode === kode4String(kode);
      }
    },
    opstillingskredskode: {
      values: ['099'],
      verifier: function(adr, kode) {
        return adr.opstillingskreds.kode === kode4String(kode);
      }
    },
    zone: {
      values: ['Byzone'],
      verifier: function(adr, zone) {
        return adr.zone === zone;
      }
    },
    zonekode: {
      values: ['1'],
      verifier: function(adr, zone) {
        return adr.zone === 'Byzone';
      }
    },
    ejerlavkode: {
      values: ['1', '01'],
      verifier: function(adr, ejerlavkode) {
        return adr.jordstykke && adr.jordstykke.ejerlav.kode === parseInt(ejerlavkode, 10);
      }
    },
    matrikelnr: {
      values: ['ab1f'],
      verifier: function(adr, matrikelnr) {
        return adr.jordstykke && adr.jordstykke.matrikelnr === matrikelnr;
      }
    },
    esrejendomsnr: {
      values: ['002626', '2626'],
      verifier: function(adr, esrejendomsnr) {
        return parseInt(adr.esrejendomsnr, 10) === parseInt(esrejendomsnr, 10);
      }
    }
  },
  adresse: {
    id: {
      values: ['07839141-fca3-49ef-8747-2e9a5551dd6d'],
      verifier: function(adr, id) {
        return adr.id === id;
      }
    },
    status: {
      values: ['1'],
      verifier: function(adr, status) {
        return adr.status === parseInt(status, 10);
      }
    },
    etage: {
      values: ['kl', '1', '', 'st|'],
      verifier: multiVerifier(function(adr, etage) {
        if (etage === '') {
          return adr.etage === null;
        }

        return adr.etage === etage;
      })
    },
    dør: {
      values: ['tv', '1'],
      verifier: function(adr, dør) {
        return adr.dør === dør;
      }
    },
    adgangsadresseid: {
      values: ['0a3f507b-b8f0-32b8-e044-0003ba298018'],
      verifier: function(adr, id) {
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
      values: ['Birkede Brovej'],
      verifier: function(adr, vejnavn) {
        return adr.adgangsadresse.vejstykke.navn === vejnavn;
      }

    },
    husnr: {
      values: ['130A'],
      verifier: function(adr, husnr) {
        return adr.adgangsadresse.husnr === husnr;
      }
    },
    supplerendebynavn: {
      values: ['Kerte'],
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
    nøjagtighed: {
      values: ['A'],
      verifier: function(adr, nøjagtighed) {
        return adr.adgangsadresse.adgangspunkt.nøjagtighed === nøjagtighed;
      }
    },
    kommunekode: {
      values: ['461', '0461'],
      verifier: function(adr, kode) {
        return adr.adgangsadresse.kommune.kode === kode4String(kode);
      }
    },
    regionskode: {
      values: ['099'],
      verifier: function(adr, kode) {
        return adr.adgangsadresse.region.kode === kode4String(kode);
      }
    },
    sognekode: {
      values: ['099'],
      verifier: function(adr, kode) {
        return adr.adgangsadresse.sogn.kode === kode4String(kode);
      }
    },
    politikredskode: {
      values: ['099'],
      verifier: function(adr, kode) {
        return adr.adgangsadresse.politikreds.kode === kode4String(kode);
      }
    },
    retskredskode: {
      values: ['099'],
      verifier: function(adr, kode) {
        return adr.adgangsadresse.retskreds.kode === kode4String(kode);
      }
    },
    opstillingskredskode: {
      values: ['099'],
      verifier: function(adr, kode) {
        return adr.adgangsadresse.opstillingskreds.kode === kode4String(kode);
      }
    },
    zone: {
      values: ['Byzone'],
      verifier: function(adr, zone) {
        return adr.adgangsadresse.zone === zone;
      }
    },
    zonekode: {
      values: ['1'],
      verifier: function(adr, zone) {
        return adr.adgangsadresse.zone === 'Byzone';
      }
    },
    ejerlavkode: {
      values: ['1', '01'],
      verifier: function(adr, ejerlavkode) {
        return adr.adgangsadresse.jordstykke &&
          adr.adgangsadresse.jordstykke.ejerlav.kode === parseInt(ejerlavkode, 10);
      }
    },
    matrikelnr: {
      values: ['ab1f'],
      verifier: function(adr, matrikelnr) {
        return adr.adgangsadresse.jordstykke && adr.adgangsadresse.jordstykke.matrikelnr === matrikelnr;
      }
    },
    esrejendomsnr: {
      values: ['002626', '2626'],
      verifier: function(adr, esrejendomsnr) {
        return parseInt(adr.adgangsadresse.esrejendomsnr, 10) === parseInt(esrejendomsnr, 10);
      }
    }
  }
};

var additionalParameters = {
  adgangsadresse: commonParameters.dagiFilter,
  adresse: commonParameters.dagiFilter
};

_.keys(sampleParameters).forEach(function(specName) {
  var propertyFilterParameters = registry.findWhere({
    entityName: specName,
    type: 'parameterGroup',
    qualifier: 'propertyFilter'
  });
  var jsonRepresentation = registry.findWhere({
    entityName: specName,
    type: 'representation',
    qualifier: 'json'
  });
  var sqlModel = registry.findWhere({
    entityName: specName,
    type: 'sqlModel'
  });
  var allParameters = propertyFilterParameters.concat(additionalParameters[specName] || []);
  describe('Query for ' + specName, function() {
    it('tester alle parametre', function() {
      var specifiedParameterNames = _.pluck(allParameters, 'name');
      var testedParameterNames = _.keys(sampleParameters[specName]);
      expect(_.difference(specifiedParameterNames, testedParameterNames)).to.deep.equal([]);
    });
    describe('Parametre for ' + specName, function() {
      _.each(sampleParameters[specName], function(sample, paramName) {
        var verify = sample.verifier;
        sample.values.forEach(function(sampleValue) {
          describe('case ' + paramName + '=' + sampleValue, function() {
            it('Query for ' + specName + ' case ' + paramName + '=' + sampleValue + ' skal returnere korrekt resultat', function(done) {
              var parseResult;
              var rawQueryParams = {};
              rawQueryParams[paramName] = sampleValue;
              parseResult = parameterParsing.parseParameters(rawQueryParams, _.indexBy(allParameters, 'name'));
              expect(parseResult.errors.length).to.equal(0);
              parseResult.params.per_side = 100;
              var query = sqlModel.createQuery(_.pluck(jsonRepresentation.fields, 'name'), parseResult.params);
              dbapi.withReadonlyTransaction(function(err, client, transactionDone) {
                expect(err).to.not.exist;
                if (err) throw 'unable to open connection';
                dbapi.queryRaw(client, query.sql, query.params, function(err, rows) {
                  transactionDone();
                  expect(err).to.not.exist;
                  expect(rows.length).to.be.above(0);
                  var mappedRows = _.map(rows, jsonRepresentation.mapper("BASE_URL", parseResult.params));
                  mappedRows.forEach(function(json) {
                    var verifyResult = verify(json, sampleValue);
                    expect(verifyResult).to.equal(true);
                  });
                  done();
                });
              });
            });
          });
        });
      });
    });
  });
});
