"use strict";

var _ = require('underscore');

var representationUtil = require('../common/representationUtil');
var fields = require('./fields');
var commonMappers = require('../commonMappers');
var commonSchemaDefinitionsUtil = require('../commonSchemaDefinitionsUtil');
var schemaUtil = require('../schemaUtil');

var normalizedFieldSchemas = require('../replikering/normalizedFieldSchemas');

var normalizedFieldSchema = function(fieldName) {
  return normalizedFieldSchemas.normalizedSchemaField('postnummer', fieldName);
};

var globalSchemaObject = commonSchemaDefinitionsUtil.globalSchemaObject;
var makeHref = commonMappers.makeHref;
var mapPostnummerRef = commonMappers.mapPostnummerRef;
var mapKommuneRefArray = commonMappers.mapKommuneRefArray;

var nullableType = schemaUtil.nullableType;
var kode4String = require('../util').kode4String;

var fieldsExcludedFromFlat = ['geom_json', 'stormodtageradresser'];
var flatFields = representationUtil.fieldsWithoutNames(fields, fieldsExcludedFromFlat).concat('stormodtager');


exports.flat = representationUtil.defaultFlatRepresentation(flatFields);

var fieldsExcludedFromJson = ['geom_json'];
exports.json = {
  schema: globalSchemaObject({
    'title': 'postnummer',
    'properties': {
      'href': {
        description: 'Postnummerets unikke URL.',
        '$ref': '#/definitions/Href'
      },
      'nr'      : normalizedFieldSchema('nr'),
      'navn'    : normalizedFieldSchema('navn'),
      'stormodtageradresser': {
        description: 'Hvis postnummeret er et stormodtagerpostnummer rummer feltet adresserne på stormodtageren.',
        type: nullableType('array'),
        items: {
          '$ref': '#/definitions/AdgangsadresseRef'
        }
      },
      'kommuner': {
        description: 'De kommuner hvis areal overlapper postnumeret areal.',
        type: 'array',
        items: {
          '$ref': '#/definitions/KommuneRef'
        }
      },
      bbox: {
        description: 'Bounding box for postnummeret',
        '$ref': '#/definitions/NullableBbox'
      },
      visueltcenter: {
        description: 'Det visuelle center for postnummeret. Kan f.eks. anvendes til placering af labels på et kort.',
        '$ref': '#/definitions/NullableVisueltCenter'
      }
    },
    'docOrder': ['href','nr', 'navn', 'stormodtageradresser', 'bbox', 'visueltcenter', 'kommuner']
  }),
  fields: _.filter(_.where(fields, { selectable: true }), function(field) {
    return !_.contains(fieldsExcludedFromJson, field.name);
  }),
  mapper: function (baseUrl) {
    return function(row) {
      return {
        href: makeHref(baseUrl, 'postnummer', [row.nr]),
        nr:  kode4String(row.nr),
        navn: row.navn,
        stormodtageradresser: row.stormodtageradresser ? _.map(row.stormodtageradresser, function(adgangsadresseid) {
          return commonMappers.mapAdgangsadresseRef(adgangsadresseid, baseUrl);
        }) : null,
        bbox: commonMappers.mapBbox(row),
        visueltcenter: commonMappers.mapVisueltCenter(row),
        kommuner: row.kommuner ? mapKommuneRefArray(row.kommuner,baseUrl) : []
      };
    };
  }
};

var autocompleteFieldNames = ['nr', 'navn'];
exports.autocomplete = {
  schema: globalSchemaObject( {
    properties: {
      tekst: {
        description: 'Postnummeret (4 cifre) efterfulgt af postnummerområdets navn, f.eks. "8260 Viby J".',
        type: 'string'
      },
      postnummer: {
        description: 'Link og basale data for postnummret.',
        $ref: '#/definitions/PostnummerRef'
      }
    },
    docOrder: ['tekst', 'postnummer']
  }),
  fields: _.filter(fields, function(field) {
    return _.contains(autocompleteFieldNames, field.name);
  }),
  mapper: function(baseUrl) {
    return function(row) {
      return {
        tekst: row.nr + ' ' + row.navn,
        postnummer: mapPostnummerRef(row, baseUrl)
      };
    };
  }
};

const geojsonField = _.findWhere(fields, {name: 'geom_json'});
exports.geojson = representationUtil.geojsonRepresentation(geojsonField, exports.flat);
exports.geojsonNested = representationUtil.geojsonRepresentation(geojsonField, exports.json);

var registry = require('../registry');
registry.addMultiple('postnummer', 'representation', module.exports);
