"use strict";

var _ = require('underscore');

var representationUtil = require('../common/representationUtil');
var fields = require('./fields');
var commonMappers = require('../commonMappers');
var commonSchemaDefinitionsUtil = require('../commonSchemaDefinitionsUtil');
var schemaUtil = require('../schemaUtil');
var util = require('../util');
var normalizedFieldSchemas = require('../replikering/normalizedFieldSchemas');

var normalizedFieldSchema = function(fieldName) {
  return normalizedFieldSchemas.normalizedSchemaField('vejstykke', fieldName);
};


var d = util.d;
var globalSchemaObject = commonSchemaDefinitionsUtil.globalSchemaObject;
var makeHref = commonMappers.makeHref;
var mapPostnummerRefArray = commonMappers.mapPostnummerRefArray;
var mapKommuneRef = commonMappers.mapKommuneRef;
var kode4String = require('../util').kode4String;
var schemaObject = schemaUtil.schemaObject;

exports.flat = representationUtil.defaultFlatRepresentation(representationUtil.fieldsWithoutNames(fields, ['geom_json']));

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
      'kode': normalizedFieldSchema('kode'),
      'navn' : normalizedFieldSchema('navn'),
      'adresseringsnavn': normalizedFieldSchema('adresseringsnavn'),
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
        'description': 'Væsentlige tidspunkter for vejstykket',
        properties: {
          'oprettet': normalizedFieldSchema('oprettet'),
          'ændret': normalizedFieldSchema('ændret')
        },
        docOrder: ['oprettet', 'ændret']

      })
    },
    docOrder: ['href', 'kode', 'navn', 'adresseringsnavn', 'kommune', 'postnumre', 'historik']
  }),
  fields: representationUtil.fieldsWithoutNames(_.where(fields, {'selectable' : true}), ['geom_json']),
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
const geomJsonField = _.findWhere(fields, {name: 'geom_json'});
exports.geojson = representationUtil.geojsonRepresentation(geomJsonField, exports.flat);
exports.geojsonNested = representationUtil.geojsonRepresentation(geomJsonField, exports.json);

var registry = require('../registry');
registry.addMultiple('vejstykke', 'representation', module.exports);
