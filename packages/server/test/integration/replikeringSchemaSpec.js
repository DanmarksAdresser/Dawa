"use strict";

var expect = require('chai').expect;
var request = require("request-promise");

var schemas = [
  'postnumre', 'vejstykker', 'adgangsadresser', 'adresser',
  'ejerlav', 'regionstilknytninger', 'kommunetilknytninger',
  'postnummertilknytninger', 'sognetilknytninger', 'politikredstilknytninger',
  'opstillingskredstilknytninger', 'valglandsdelstilknytninger',
  'zonetilknytninger', 'jordstykketilknytninger'
];

var postnumre = {
  "source": "http://dawa.aws.dk/replikering/postnumre",
  "schema": [
    {
      "name": "sekvensnummer",
      "description": "Unikt sekvensnummer for hændelsen.",
      "type": "integer",
      "required": true
    },
    {
      "name": "tidspunkt",
      "description": "Tidspunktet hvor hændelsen blev indlæst af DAWA.",
      "type": "string",
      "required": true
    },
    {
      "name": "operation",
      "description": "Hvilken type operation hændelsen vedrører: indsættelse, opdatering eller sletning.",
      "type": "string",
      "required": true
    },
    {
      "name": "data",
      "description": "",
      "type": "object",
      "required": true,
      "properties": [
        {
          "name": "nr",
          "description": "Unik identifikation af det postnummeret. Postnumre fastsættes af Post Danmark. Repræsenteret ved fire cifre. Eksempel: ”2400” for ”København NV”.",
          "type": "string",
          "required": true,
          "postgresql": "INTEGER",
          "primary": true,
          "deprecated": false
        },
        {
          "name": "navn",
          "description": "Det navn der er knyttet til postnummeret, typisk byens eller bydelens navn. Repræsenteret ved indtil 20 tegn. Eksempel: ”København NV”.",
          "type": "string",
          "required": true,
          "postgresql": "VARCHAR(20)",
          "primary": false,
          "deprecated": false
        },
        {
          "name": "stormodtager",
          "description": "Hvorvidt postnummeret er en særlig type, der er tilknyttet en organisation der modtager en større mængde post.",
          "type": "boolean",
          "required": true,
          "postgresql": "BOOLEAN",
          "primary": false,
          "deprecated": false
        }
      ]
    }
  ]
};

describe("Replikering schema.json", function() {
  it("Alle skema ekisterer", function() {
    return request.get({url: "http://localhost:3002/replikeringdok/schema.json", json: true}).then(function(result) {
      expect(Object.keys(result)).to.deep.equal(schemas);
    });
  });

  it("Postnumre skema er korrekt", function() {
    return request.get({url: "http://localhost:3002/replikeringdok/schema.json", json: true}).then(function(result) {
      expect(result.postnumre).to.deep.equal(postnumre);
    });
  });
});
