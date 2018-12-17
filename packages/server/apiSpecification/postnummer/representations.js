"use strict";

const _ = require('underscore');

const representationUtil = require('../common/representationUtil');
const fields = require('./fields');
const commonMappers = require('../commonMappers');
const commonSchemaDefinitionsUtil = require('../commonSchemaDefinitionsUtil');
const schemaUtil = require('../schemaUtil');

const normalizedFieldSchemas = require('../replikering/normalizedFieldSchemas');

const normalizedFieldSchema = function(fieldName) {
  return normalizedFieldSchemas.normalizedSchemaField('postnummer', fieldName);
};

const globalSchemaObject = commonSchemaDefinitionsUtil.globalSchemaObject;
const makeHref = commonMappers.makeHref;
const mapPostnummerRef = commonMappers.mapPostnummerRef;
const mapKommuneRefArray = commonMappers.mapKommuneRefArray;

const nullableType = schemaUtil.nullableType;
const { numberToString, kode4String} = require('../util');

const fieldsExcludedFromFlat = ['geom_json', 'stormodtageradresser'];
const flatFields = representationUtil.fieldsWithoutNames(fields, fieldsExcludedFromFlat).concat('stormodtager');


exports.flat = representationUtil.defaultFlatRepresentation(flatFields);

const fieldsExcludedFromJson = ['geom_json'];
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
      },
      'ændret': {
        description: 'Tidspunkt for seneste ændring registreret i DAWA. Opdateres ikke hvis ændringen kun vedrører' +
        ' geometrien (se felterne geo_ændret og geo_version).',
        $ref: '#/definitions/NullableDateTimeUtc'
      },
      'geo_ændret': {
        description: 'Tidspunkt for seneste ændring af geometrien registreret i DAWA.',
        $ref: '#/definitions/NullableDateTimeUtc'
      },
      geo_version: {
        description: 'Versionsangivelse for geometrien. Inkrementeres hver gang geometrien ændrer sig i DAWA.',
        type: ['integer', 'null']
      },
      dagi_id: {
        description: 'Postnummerets unikke ID i DAGI. Heltal som string.',
        type: ['string', 'null']
      }
    },
    'docOrder': ['href','nr', 'navn', 'stormodtageradresser', 'bbox', 'visueltcenter', 'kommuner', 'ændret', 'geo_ændret', 'geo_version', 'dagi_id']
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
        kommuner: row.kommuner ? mapKommuneRefArray(row.kommuner,baseUrl) : [],
        ændret: row.ændret,
        geo_ændret: row.geo_ændret,
        geo_version: row.geo_version,
        dagi_id: numberToString(row.dagi_id)
      };
    };
  }
};

const autocompleteFieldNames = ['nr', 'navn'];
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

const registry = require('../registry');
registry.addMultiple('postnummer', 'representation', module.exports);
