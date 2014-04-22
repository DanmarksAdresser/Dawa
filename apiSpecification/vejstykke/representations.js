"use strict";

var _ = require('underscore');

var representationUtil = require('../common/representationUtil');
var fields = require('./fields');
var commonMappers = require('../commonMappers');
var commonSchemaDefinitionsUtil = require('../commonSchemaDefinitionsUtil');
var schemaUtil = require('../schemaUtil');
var util = require('../util');

var d = util.d;
var globalSchemaObject = commonSchemaDefinitionsUtil.globalSchemaObject;
var makeHref = commonMappers.makeHref;
var mapPostnummerRefArray = commonMappers.mapPostnummerRefArray;
var mapKommuneRef = commonMappers.mapKommuneRef;
var kode4String = require('../util').kode4String;
var schemaObject = schemaUtil.schemaObject;

var nullableType = schemaUtil.nullableType;

exports.flat = representationUtil.defaultFlatRepresentation(fields);

var autocompleteFieldNames = ['navn', 'kommunekode', 'kode'];
var autocompleteFields = _.filter(fields, function(field) {
  return _.contains(autocompleteFieldNames, field.name);
});
exports.autocomplete = {
  schema: globalSchemaObject( {
    properties: {
      tekst: {
        description: 'Navnet på vejstykket',
        type: 'string'
      },
      vejstykke: {
        description: 'Link og basale data for vejstykket',
        $ref: '#/definitions/VejstykkeRef'
      }
    },
    docOrder: ['tekst', 'vejstykke']
  }),
  fields: autocompleteFields,
  mapper: function (baseUrl, params) {
    return function(row) {
      return {
        tekst: row.navn,
        vejstykke: {
          href: makeHref(baseUrl, 'vejstykke', [row.kommunekode, row.kode]),
          kommunekode: kode4String(row.kommunekode),
          kode: kode4String(row.kode),
          navn: row.navn
        }
      };
    };
  }
};

exports.json = {
  schema: globalSchemaObject({
    'title': 'vejstykke',
    'properties': {
      'href': {
        description: 'Vejstykkets unikke URL.',
        $ref: '#/definitions/Href'
      },
      'kode': {
        description: 'Identifikation af vejstykke. ' +
          'Er unikt indenfor den pågældende kommune. Repræsenteret ved fire cifre. ' +
          'Eksempel: I Københavns kommune er ”0004” lig ”Abel Cathrines Gade”.',
        '$ref': '#/definitions/Kode4'
      },
      'navn' : {
        description: 'Vejens navn som det er fastsat og registreret af kommunen. Repræsenteret ved indtil 40 tegn. Eksempel: ”Hvidkildevej”.',
        type: 'string',
        maxLength: 40
      },
      'adresseringsnavn': {
        description: 'En evt. forkortet udgave af vejnavnet på højst 20 tegn, som bruges ved adressering på labels og rudekuverter og lign., hvor der ikke plads til det fulde vejnavn.',
        type: nullableType('string'),
        maxLength: 20
      },
      'kommune': {
        description: 'Kommunen som vejstykket er beliggende i.',
        $ref: '#/definitions/KommuneRef'
      },
      'postnumre': {
        description: 'Postnummrene som vejstykket er beliggende i.',
        type: 'array',
        items: {
          $ref: '#/definitions/PostnummerRef'
        }
      },
      'historik' : schemaObject({
        'description': 'Væsentlige tidspunkter for adgangsadressen',
        properties: {
          'oprettet': {
            description: 'Dato og tid for adgangsadressens oprettelse. Eksempel: 2001-12-23T00:00:00.',
            '$ref': '#/definitions/NullableDateTime'
          },
          'ændret': {
            description: 'Dato og tid hvor der sidst er ændret i adgangsadressen. Eksempel: 2002-04-08T00:00:00.',
            type: nullableType('string'),
            '$ref': '#/definitions/NullableDateTime'
          }
        },
        docOrder: ['oprettet', 'ændret']

      })
    },
    docOrder: ['href', 'kode', 'navn', 'adresseringsnavn', 'kommune', 'postnumre', 'historik']
  }),
  fields: _.where(fields, {'selectable' : true}),
  mapper: function(baseUrl) {
    return function(row) {
      return {
        href: makeHref(baseUrl, 'vejstykke', [row.kommunekode, row.kode]),
        kode: kode4String(row.kode),
        navn: row.navn,
        adresseringsnavn: row.adresseringsnavn,
        kommune: mapKommuneRef({ kode: row.kommunekode, navn: row.kommunenavn}, baseUrl),
        postnumre: mapPostnummerRefArray(row.postnumre, baseUrl),
        historik: {
          oprettet: d(row.oprettet),
          ændret: d(row.ændret)
        }
      };
    };
  }
};

var registry = require('../registry');
registry.addMultiple('vejstykke', 'representation', module.exports);