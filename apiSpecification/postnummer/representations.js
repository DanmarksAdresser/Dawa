"use strict";

var _ = require('underscore');

var flatRepresentationUtil = require('../common/flatRepresentationUtil');
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

var fieldsExcludedFromCsv = ['geom_json'];
var flatFields = _.filter(flatRepresentationUtil.flatCandidateFields(fields), function(field) {
  return !_.contains(fieldsExcludedFromCsv, field.name);
});

exports.flat = {
  fields: flatFields,
  mapper: function(baseUrl, params) {
    return flatRepresentationUtil.defaultFlatMapper(flatFields);
  }
};

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
      'version' : {
        '$ref': '#/definitions/DateTime'
      },
      'stormodtageradresse': {
        description: 'Hvis postnummeret er et stormodtagerpostnummer rummer feltet adressen på stormodtageren.',
        type: nullableType('string')
      },
      'kommuner': {
        description: 'De kommuner hvis areal overlapper postnumeret areal.',
        type: 'array',
        items: {
          '$ref': '#/definitions/KommuneRef'
        }
      }
    },
    'docOrder': ['href','nr', 'navn', 'version', 'stormodtageradresse', 'kommuner']
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
        version: row.version,
        stormodtageradresse: null,
        kommuner: mapKommuneRefArray(row.kommuner,baseUrl)
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

exports.geojson = {
  fields: _.where(fields, { selectable: true }),
  mapper: function(baseUrl, params, singleResult) {
    var flatMapper = exports.flat.mapper(baseUrl, params, singleResult);
    return function(row) {
      var result = {};
      result.type = 'Feature';
      if (row.geom_json) {
        result.geometry = JSON.parse(row.geom_json);
      }
      if (singleResult) {
        result.crs = {
          type: 'name',
          properties: {
            name: 'EPSG:' + (params.srid || 4326)
          }
        };
      }
      result.properties = flatMapper(row);
      return result;
    };
  }
};
