"use strict";

var model = require("../../awsDataModel");
var ZSchema = require("z-schema");
var validator = new ZSchema({noZeroLengthStrings: true,
                             noExtraKeywords: false,
                             forceItems: true,
                             forceProperties: true});


function valid(data, schema, done){
  validator.validate(data, schema)
    .then(function(report){
      expect(report.valid).toBe(true);
      done();
    })
    .catch(function(err){
      console.log(err);
      expect(err).toBe(false);
      done();
    });
}

function invalid(data, schema, invalidPattern, done){
  validator.validate(data, schema)
    .then(function(report){
      expect(report.valid).toBe(false);
      done();
    })
    .catch(function(err){
      expect(err.errors[0].code).toMatch(invalidPattern);
      done();
    });
}

describe("Postnummer schema validation", function () {
  it("should validate basic datum", function (done) {
    valid(
      {"href": "http://dawa.aws.dk/postnumre/8600",
        "nr": "8600",
        "navn": "Silkeborg",
        "version": "2011-12-02T04:20:03+01:00",
        stormodtageradresse: null,
        "kommuner": [
          {"href": "http://dawa.aws.dk/kommuner/740", "kode": "0740", "navn": "Silkeborg"}
        ]},
      model.postnummer.schema,
          done);
  });
  it("should fail on 5 digit zip", function (done) {
    invalid({"href": "http://dawa.aws.dk/postnumre/8600",
      "nr": "86000",
      "navn": "Silkeborg",
      "version": "2011-12-02T04:20:03+01:00",
      stormodtageradresse: null,
      "kommuner": [
        {"href": "http://dawa.aws.dk/kommuner/740", "kode": "0740", "navn": "Silkeborg"}
      ]}, model.postnummer.schema, 'PATTERN', done);
  });

  it("should fail on extra properties", function (done) {
    invalid({nr: "8600", navn: 'Silkeborg', version: 'ver1',
      stormodtageradresse: null,
      foo: 42, kommuner: []}, model.postnummer.schema, 'OBJECT_ADDITIONAL_PROPERTIES', done);
  });
});

describe("AdgangsAdresse schema validation", function () {
  it("should fail on OBJECT_ADDITIONAL_PROPERTIES, this assert that the schema is valid", function (done) {
    invalid({foo: 42}, model.adgangsadresse.schema, 'OBJECT_ADDITIONAL_PROPERTIES', done);
  });
});

describe("Adresse schema validation", function () {
  it("should fail on OBJECT_ADDITIONAL_PROPERTIES, this assert that the schema is valid", function (done) {
    invalid({foo: 42}, model.adresse.schema, 'OBJECT_ADDITIONAL_PROPERTIES', done);
  });

  it("should validate complete address", function (done) {
    valid({
        href: 'link',
        id: "98349834-9834-9834-9834-983498349834",
        etage: '1',
        dør: 'tv',
        adressebetegnelse: "noeh",
        adgangsadresse: {
          href: 'link',
          "id": "0a3f50ae-da7f-32b8-e044-0003ba298018",
          "vejstykke": {
            href: 'link',
            "kode": "0237",
            "navn": "Fægangen"
          },
          "husnr": "1",
          "supplerendebynavn": "Byen",
          "postnummer": {
            href: 'link',
            "nr": "4180",
            "navn": "Sorø"
          },
          "kommune": {
            href: 'link',
            "kode": "0340",
            "navn": "Kommune 0340"
          },
          "ejerlav": {
            "kode": 340,
            "navn": "Ejerlav 340"
          },
          'esrejendomsnr': null,
          "historik": {
            "oprettet": "dato",
            "ændret": "dato",
            'ikrafttrædelse': null
          },
          "matrikelnr": "3b",
          "adgangspunkt": {
            "koordinater": [
              10.1072927531609,
              56.3303963702154
            ],
            "nøjagtighed": "A",
            "kilde": 5,
            "tekniskstandard": "TK",
            "tekstretning": 115.67,
            "ændret": "dato"
          },
          "DDKN": {
            "m100": "100m_61464_6619",
            "km1": "1km_6146_661",
            "km10": "10km_614_66"
          },
          "sogn": {"kode": "7383",
            "navn": "Sorø"},
          "region": {"kode": "7383",
            "navn": "Sorø"},
          "retskreds": {"kode": "7383",
            "navn": "Sorø"},
          "politikreds": {"kode": "7383",
            "navn": "Sorø"},
          "opstillingskreds": {"kode": "7383",
            "navn": "Sorø"}
        }
      },
          model.adresse.schema,
          done);
  });
});

describe('Vejnavn schema validation', function() {
  it("should validate basic datum", function (done) {
    valid({
        "href": "http://dawa.aws.dk/vejnavne/Avnsbjergvej",
        "navn": "Avnsbjergvej",
        "postnumre": [
          {
            "href": "http://dawa.aws.dk/postnumre/4174",
            "nr": "4174",
            "navn": "Jystrup Midtsj"
          }
        ],
        "kommuner": [
          {
            "href": "http://dawa.aws.dk/kommuner/329",
            "kode": "0329",
            "navn": "Ringsted"
          }
        ]
      },
      model.vejnavn.schema, done);
  });
});

describe("Vejstykke schema validation", function () {
  it("should validate basic datum", function (done) {
    valid({"href": "http://dawa.aws.dk/vejstykker/0101/0004", "kode": "0004", "navn": "Abel Cathrines Gade", "kommune": {"href": "http://dawa.aws.dk/kommuner/101", "kode": "0101", "navn": "København"}, "postnumre": [
        {"href": "http://dawa.aws.dk/postnumre/1654", "nr": "1654", "navn": "København V"}
      ]},
      model.vejstykke.schema, done);
  });

});

describe("Supplendebynavn schema validation", function () {
  it("should validate basic datum", function (done) {
    valid({href: 'http://dawa.aws.dk/supplerendebynavne/Aa', "navn": "Aa", "postnumre": [
        {"href": "http://dawa.aws.dk/postnumre/5631", "nr": "5631", "navn": "Ebberup"}
      ], "kommuner": [
        {"href": "http://dawa.aws.dk/kommuner/420", "kode": "0420", "navn": "Assens"}
      ]},
      model.supplerendebynavn.schema, done);
  });
});


var regExpTestSchema =  {
  'type': 'object',
  'properties': {
    'UpTo5': { type: 'string', pattern: '^\\d{1,5}$'}
  },
  'additionalProperties': false
};

describe("RegExp validation", function () {
  it("should support the regexp construct: {x,y}", function (done) {
    valid({UpTo5: '0'},regExpTestSchema, done);
  });

  it("should support the regexp construct: {x,y}", function (done) {
    valid({UpTo5: '99999'},regExpTestSchema, done);
  });

  it("should support the regexp construct: {x,y}", function (done) {
    invalid({UpTo5: ''},regExpTestSchema, 'PATTERN', done);
  });

  it("should support the regexp construct: {x,y}", function (done) {
    invalid({UpTo5: '555555'},regExpTestSchema, 'PATTERN', done);
  });

});
