"use strict";

// In this test, we retrieve objects from the test dataset by ID, and verify that the JSON result is as expected.
// Thus, this test verifies that the API is stable.

var expect = require('chai').expect;
var q = require('q');
var _ = require('underscore');

var testdb = require('../helpers/testdb');
var helpers = require('./helpers');
var registry = require('../../apiSpecification/registry');
require('../../apiSpecification/allSpecs');

var BASE_URL = "http://dawa";
var ANY_TIMESTAMP_UTC = "ANY_TIMESTAMP_UTC";

var expectedResultsMap = {
  adgangsadresse: [{
    "href": BASE_URL + "/adgangsadresser/0a3f507d-f270-32b8-e044-0003ba298018",
    "id": "0a3f507d-f270-32b8-e044-0003ba298018",
    "kvh": "01851640_60C",
    "status": 1,
    "vejstykke": {
      "href": BASE_URL + "/vejstykker/185/1640",
      "navn": "Hilversumvej",
      "kode": "1640"
    },
    "husnr": "60C",
    "supplerendebynavn": null,
    "postnummer": {
      "href": BASE_URL + "/postnumre/2791",
      "nr": "2791",
      "navn": "Dragør"
    },
    "kommune": {
      "href": BASE_URL + "/kommuner/185",
      "kode": "0185",
      "navn": "Tårnby"
    },
    "ejerlav": {
      "kode": 11659,
      "navn": "Tømmerup By, Tårnby"
    },
    "esrejendomsnr": "52311",
    "matrikelnr": "2q",
    "historik": {
      "oprettet": "2000-02-05T12:00:00.000",
      "ændret": "2000-02-16T10:11:49.000"
    },
    "adgangspunkt": {
      "koordinater": [
        725025.18,
        6166305.59
      ],
      "nøjagtighed": "A",
      "kilde": 1,
      "tekniskstandard": "TN",
      "tekstretning": 0,
      "ændret": "2009-11-24T01:50:11.000"
    },
    "DDKN": {
      "m100": "100m_61663_7250",
      "km1": "1km_6166_725",
      "km10": "10km_616_72"
    },
    "sogn": {
      "kode": "0099",
      "navn": "Sogn test",
      "href": BASE_URL + "/sogne/99"
    },
    "region": {
      "kode": "0099",
      "navn": "Region test",
      "href": BASE_URL + "/regioner/99"
    },
    "retskreds": {
      "kode": "0099",
      "navn": "retskreds test",
      "href": BASE_URL + "/retskredse/99"
    },
    "politikreds": {
      "kode": "0099",
      "navn": "Politikreds test",
      "href": BASE_URL + "/politikredse/99"
    },
    "opstillingskreds": {
      "kode": "0099",
      "navn": "Opstillingskreds test",
      "href": BASE_URL + "/opstillingskredse/99"
    },
    "zone": "Byzone"
  }],
  adresse: [{
    "id": "0a3f50a7-44a6-32b8-e044-0003ba298018",
    "kvhx": "01851640_60C_______",
    "status": 1,
    "href": BASE_URL + "/adresser/0a3f50a7-44a6-32b8-e044-0003ba298018",
    "historik": {
      "oprettet": "2000-02-05T12:00:00.000",
      "ændret": "2000-02-16T10:11:49.000"
    },
    "etage": null,
    "dør": null,
    "adressebetegnelse": "Hilversumvej 60C, 2791 Dragør",
    "adgangsadresse": {
      "href": BASE_URL + "/adgangsadresser/0a3f507d-f270-32b8-e044-0003ba298018",
      "id": "0a3f507d-f270-32b8-e044-0003ba298018",
      "kvh": "01851640_60C",
      "status": 1,
      "vejstykke": {
        "href": BASE_URL + "/vejstykker/185/1640",
        "navn": "Hilversumvej",
        "kode": "1640"
      },
      "husnr": "60C",
      "supplerendebynavn": null,
      "postnummer": {
        "href": BASE_URL + "/postnumre/2791",
        "nr": "2791",
        "navn": "Dragør"
      },
      "kommune": {
        "href": BASE_URL + "/kommuner/185",
        "kode": "0185",
        "navn": "Tårnby"
      },
      "ejerlav": {
        "kode": 11659,
        "navn": "Tømmerup By, Tårnby"
      },
      "esrejendomsnr": "52311",
      "matrikelnr": "2q",
      "historik": {
        "oprettet": "2000-02-05T12:00:00.000",
        "ændret": "2000-02-16T10:11:49.000"
      },
      "adgangspunkt": {
        "koordinater": [
          725025.18,
          6166305.59
        ],
        "nøjagtighed": "A",
        "kilde": 1,
        "tekniskstandard": "TN",
        "tekstretning": 0,
        "ændret": "2009-11-24T01:50:11.000"
      },
      "DDKN": {
        "m100": "100m_61663_7250",
        "km1": "1km_6166_725",
        "km10": "10km_616_72"
      },
      "sogn": {
        "kode": "0099",
        "navn": "Sogn test",
        "href": BASE_URL + "/sogne/99"
      },
      "region": {
        "kode": "0099",
        "navn": "Region test",
        "href": BASE_URL + "/regioner/99"
      },
      "retskreds": {
        "kode": "0099",
        "navn": "retskreds test",
        "href": BASE_URL + "/retskredse/99"
      },
      "politikreds": {
        "kode": "0099",
        "navn": "Politikreds test",
        "href": BASE_URL + "/politikredse/99"
      },
      "opstillingskreds": {
        "kode": "0099",
        "navn": "Opstillingskreds test",
        "href": BASE_URL + "/opstillingskredse/99"
      },
      "zone": "Byzone"
    }
  }],
  supplerendebynavn: [{
    "href": BASE_URL + "/supplerendebynavne/Aasum",
    "navn": "Aasum",
    "postnumre": [
      {
        "href": BASE_URL + "/postnumre/5240",
        "nr": "5240",
        "navn": "Odense NØ"
      }
    ],
    "kommuner": [
      {
        "href": BASE_URL + "/kommuner/461",
        "kode": "0461",
        "navn": "Odense"
      }
    ]
  }],
  postnummer: [{
    "href": BASE_URL + "/postnumre/2791",
    "nr": "2791",
    "navn": "Dragør",
    "stormodtageradresser": null,
    "kommuner": [
      {
        "href": BASE_URL + "/kommuner/155",
        "kode": "0155",
        "navn": "Dragør"
      },
      {
        "href": BASE_URL + "/kommuner/185",
        "kode": "0185",
        "navn": "Tårnby"
      }
    ]
  }],
  vejnavn: [{
    "href": BASE_URL + "/vejnavne/Gyden",
    "navn": "Gyden",
    "postnumre": [
      {
        "href": BASE_URL + "/postnumre/4270",
        "nr": "4270",
        "navn": "Høng"
      },
      {
        "href": BASE_URL + "/postnumre/4370",
        "nr": "4370",
        "navn": "Store Merløse"
      }
    ],
    "kommuner": [
      {
        "href": BASE_URL + "/kommuner/316",
        "kode": "0316",
        "navn": "Holbæk"
      },
      {
        "href": BASE_URL + "/kommuner/326",
        "kode": "0326",
        "navn": "Kalundborg"
      }
    ]
  }],
  "ejerlav": [{
    "href": BASE_URL + "/ejerlav/11659",
    "kode": 11659,
    "navn": "Tømmerup By, Tårnby"
  }],
  "vejstykke": [{
    "href": BASE_URL + "/vejstykker/316/510",
    "kode": "0510",
    "navn": "Gyden",
    "adresseringsnavn": null,
    "kommune": {
      "href": BASE_URL + "/kommuner/316",
      "kode": "0316",
      "navn": "Holbæk"
    },
    "postnumre": [
      {
        "href": BASE_URL + "/postnumre/4370",
        "nr": "4370",
        "navn": "Store Merløse"
      }
    ],
    "historik": {
      "oprettet": null,
      "ændret": null
    }
  }],
  kommune: [{
    "kode": "0999",
    "navn": "Testkommune",
    "regionskode": "0001",
    "ændret": ANY_TIMESTAMP_UTC,
    "geo_version": 1,
    "geo_ændret": ANY_TIMESTAMP_UTC,
    "href": BASE_URL + "/kommuner/0999"
  }],
  region: [{
    "kode": "0099",
    "navn": "Region test",
    "ændret": ANY_TIMESTAMP_UTC,
    "geo_version": 1,
    "geo_ændret": ANY_TIMESTAMP_UTC,
    "href": BASE_URL + "/regioner/0099"
  }],
  sogn: [{
    "kode": "0099",
    "navn": "Sogn test",
    "ændret": ANY_TIMESTAMP_UTC,
    "geo_version": 1,
    "geo_ændret": ANY_TIMESTAMP_UTC,
    "href": BASE_URL + "/sogne/0099"
  }],
  opstillingskreds: [{
    "kode": "0099",
    "navn": "Opstillingskreds test",
    "ændret": ANY_TIMESTAMP_UTC,
    "geo_version": 1,
    "geo_ændret": ANY_TIMESTAMP_UTC,
    "href": BASE_URL + "/opstillingskredse/0099"
  }],
  retskreds: [{
    "kode": "0099",
    "navn": "retskreds test",
    "ændret": ANY_TIMESTAMP_UTC,
    "geo_version": 1,
    "geo_ændret": ANY_TIMESTAMP_UTC,
    "href": BASE_URL + "/retskredse/0099"
  }],
  politikreds: [{
    "kode": "0099",
    "navn": "Politikreds test",
    "ændret": ANY_TIMESTAMP_UTC,
    "geo_version": 1,
    "geo_ændret": ANY_TIMESTAMP_UTC,
    "href": BASE_URL + "/politikredse/0099"
  }]
};


var defaultKeyExtractor = function(keyFields) {
  return function(object) {
    return keyFields.reduce(function(memo, keyPart) {
      memo[keyPart] =  "" + object[keyPart];
      return memo;
    }, {});
  };
};
var keyExtractors = {
  vejstykke: function(vejstykke) {
    return {
      kommunekode: vejstykke.kommune.kode,
      kode: vejstykke.kode
    };
  }
};

var timestampUtcRegex = /^[\d]{4}-[\d]{2}-[\d]{2}T[\d]{2}:[\d]{2}:[\d]{2}\.[\d]{3}Z$/;

function verifyResult(path, expected, result) {
  if(_.isObject(expected) && !_.isObject(result)) {
    throw new Error(path + ": Object expected");
  }
  else if(!_.isObject(expected) && _.isObject(result)) {
    throw new Error(path + ": Object NOT expected");
  }

  if(_.isObject(expected)) {
    var expectedKeys = Object.keys(expected).sort();
    var resultKeys = Object.keys(result).sort();
    if(!_.isEqual(expectedKeys, resultKeys)) {
      throw new Error(path + ": Objects had different key sets. Expected " + JSON.stringify(expectedKeys) + ", actual: " + JSON.stringify(resultKeys));
    }
    _.each(expected, function(expectedValue, key) {
      var resultValue = result[key];
      verifyResult(path + "." + key, expectedValue, resultValue);
    });
  }
  else {
    if(expected === ANY_TIMESTAMP_UTC) {
      if(!timestampUtcRegex.test(result)) {
        throw new Error(path + ": Expected timestamp, but got " + result);
      }
    }
    else {
      if(expected !== result) {
        throw new Error(path + ": Expected " + expected + " but got " + result);
      }
    }
  }
}

describe('JSON opslag', function() {
  _.each(expectedResultsMap, function(expectedResults, entityName) {
    var nameAndKey = registry.findWhere({
      entityName: entityName,
      type: 'nameAndKey'
    });
    var resource = registry.findWhere({
      entityName: entityName,
      type: 'resource',
      qualifier: 'getByKey'
    });
    if(!resource) {
      throw new Error("Could not find getByKey resource for " + entityName);
    }
    expectedResults.forEach(function(expected) {
      it('Should return correct response for ' + entityName, function() {
        var key = (keyExtractors[entityName] || defaultKeyExtractor(nameAndKey.key))(expected);
        return testdb.withTransaction('test', 'READ_ONLY', function(client) {
          return q.nfcall(helpers.getJson, client, resource, key, { srid: "25832" }).then(function(result) {
            expect(function() {
              verifyResult("ROOT",expected, result );
            }).to.not.throw;
          });
        });
      });
    });
  });
});