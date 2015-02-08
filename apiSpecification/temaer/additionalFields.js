"use strict";

var _ = require('underscore');

var fieldsUtil = require('../common/fieldsUtil');
var commonSchemaDefinitions = require('../commonSchemaDefinitions');
var util = require('../util');

var kode4String = require('../util').kode4String;

var kode4 = {
  name: 'kode',
  schema: commonSchemaDefinitions.Kode4,
  formatter: kode4String
};

var navn = {
  name: 'navn',
  schema: {
    type: ['null', 'string']
  }
};

function describe(fieldSpec, description) {
  var result = _.clone(fieldSpec);
  result.description = description;
  return result;
}


var fieldMap = {
  region: [
    describe(kode4, 'Regionskode. 4 cifre.'),
    describe(navn, 'Regionens navn.')
  ],
  kommune: [
    describe(kode4, 'Kommunekode. 4 cifre.'),
    describe(navn, 'Kommunens navn.'),
    {
      name: 'regionskode',
      description: 'Regionskode for den region kommunen er beliggende i. 4 cifre.',
      schema: commonSchemaDefinitions.NullableKode4,
      formatter: kode4String
    }],
  sogn: [
    describe(kode4, 'Sognekode. 4 Cifre.'),
    describe(navn, 'Sognets navn.')
  ],
  politikreds: [
    describe(kode4, 'Politikredskode. 4 cifre.'),
    describe(navn, 'Politikredsens navn.')
  ],
  retskreds: [
    describe(kode4, 'Retskredskode. 4 cifre.'),
    describe(navn, 'Retskredsens navn.')
  ],
  opstillingskreds: [
    describe(kode4, 'Opstillingskredskode. 4 cifre.'),
    describe(navn, 'Opstillingskredsens navn.')
  ],
  postnummer: [
    describe({
      name: 'nr',
      schema: commonSchemaDefinitions.Kode4,
      formatter: kode4String
    }, 'Postnummer. 4 cifre.'),
    describe(navn, 'Postnummerdistriktets navn.')
  ],
  zone: [
    {
      name: 'zone',
      description: '"Byzone", "Sommerhusområde" eller "Landzone".',
      schema: {
        type: 'string'
      },
      formatter: util.zoneKodeFormatter
    }
	],
	valglandsdel: [
	  {
      name: 'bogstav',
      description: 'Valgslandsdelens bogstav, udgør nøglen.',
      schema: {
        type: 'string'
      }
	  },
    describe(navn, 'Valglandsdelens navn.')
	],
  jordstykke: [
    {
      name: 'featureID',
      description: 'Jordstykkets identifier, udgør nøglen.',
      schema: {
        type: 'string'
      }
    }, {
      name: 'ejerlavkode',
      description: 'Landsejerlavkode for det ejerlav, som jordstykket tilhører',
      schema: commonSchemaDefinitions.UpTo7
    }, {
      name: 'matrikelnr',
      description: 'Matrikelnummeret for jordstykket. Udgør sammen med ejerlavkoden en unik nøgle for jordstykket.',
      schema: commonSchemaDefinitions.matrikelnr
    }
  ]
};

_.each(fieldMap, function(fields) {
  fieldsUtil.normalize(fields);
});

_.each(fieldMap, function(fields) {
  fields.forEach(function(field) {
    field.selectable = true;
  });
});
module.exports = fieldMap;