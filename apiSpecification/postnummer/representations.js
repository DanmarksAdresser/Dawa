"use strict";

var _ = require('underscore');

var representationUtil = require('../common/representationUtil');
var fields = require('./fields');
var commonMappers = require('../commonMappers');
var commonSchemaDefinitionsUtil = require('../commonSchemaDefinitionsUtil');
var schemaUtil = require('../schemaUtil');

var globalSchemaObject = commonSchemaDefinitionsUtil.globalSchemaObject;
var makeHref = commonMappers.makeHref;
var mapPostnummerRef = commonMappers.mapPostnummerRef;
var mapKommuneRefArray = commonMappers.mapKommuneRefArray;

var nullableType = schemaUtil.nullableType;
var kode4String = require('../util').kode4String;

var fieldsExcludedFromFlat = ['geom_json'];
var flatFields = representationUtil.fieldsWithoutNames(fields, fieldsExcludedFromFlat);

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
      'nr'      : {
        description: 'Unik identifikation af det postnummer som postnummeret er beliggende i. Postnumre fastsættes af Post Danmark. Repræsenteret ved fire cifre. Eksempel: ”2400” for ”København NV”.',
        '$ref': '#/definitions/Postnr'
      },
      'navn'    : {
        description: 'Det navn der er knyttet til postnummeret, typisk byens eller bydelens navn. Repræsenteret ved indtil 20 tegn. Eksempel: ”København NV”.',
        type: 'string',
        maxLength: 20
      },
      'stormodtageradresser': {
        description: 'Hvis postnummeret er et stormodtagerpostnummer rummer feltet adresserne på stormodtageren.',
        type: nullableType('array'),
        items: { type: 'string'}
      },
      'kommuner': {
        description: 'De kommuner hvis areal overlapper postnumeret areal.',
        type: 'array',
        items: {
          '$ref': '#/definitions/KommuneRef'
        }
      }
    },
    'docOrder': ['href','nr', 'navn', 'stormodtageradresser', 'kommuner']
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
        stormodtageradresser: row.stormodtageradresser ? row.stormodtageradresser : null,
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

exports.geojson = representationUtil.geojsonRepresentation(_.findWhere(fields, {name: 'geom_json'}), exports.flat);

var registry = require('../registry');
registry.addMultiple('postnummer', 'representation', module.exports);
