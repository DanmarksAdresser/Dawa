"use strict";

const _ = require('underscore');

const representationUtil = require('../common/representationUtil');
const fields = require('./fields');
const commonMappers = require('../commonMappers');
const commonSchemaDefinitionsUtil = require('../commonSchemaDefinitionsUtil');
const normalizedFieldSchemas = require('../replikering/normalizedFieldSchemas');

const normalizedFieldSchema = function(fieldName) {
  return normalizedFieldSchemas.normalizedSchemaField('ejerlav', fieldName);
};


const globalSchemaObject = commonSchemaDefinitionsUtil.globalSchemaObject;
const makeHref = commonMappers.makeHref;

const fieldsNotIncluded = ['geom_json'];

exports.flat = representationUtil.defaultFlatRepresentation(representationUtil.fieldsWithoutNames(fields, fieldsNotIncluded));

const autocompleteFieldNames = ['navn', 'kode'];
const autocompleteFields = _.filter(fields, function(field) {
  return _.contains(autocompleteFieldNames, field.name);
});

const miniSchema = globalSchemaObject({
  properties: {
    betegnelse: {
      type: 'string',
      description: 'Tekstbeskrivelse af ejerlavet på formen "{navn} ({kode})'
    },
    'href': {
      description: 'Ejerlavets unikke URL.',
      $ref: '#/definitions/Href'
    },
    'kode': normalizedFieldSchema('kode'),
    'navn' : normalizedFieldSchema('navn')
  },
  docOrder: ['betegnelse', 'href', 'kode', 'navn']
});

exports.mini = representationUtil.miniRepresentation(['kode', 'navn'], fields, miniSchema,
  (baseUrl, row) => makeHref(baseUrl, 'ejerlav', [row.kode]),
  (row) => `${row.navn} (${row.kode})`);

exports.autocomplete = {
  schema: globalSchemaObject( {
    properties: {
      tekst: {
        description: 'Ejerlavets kode efterfulgt af dets navn',
        type: 'string'
      },
      ejerlav: {
        description: 'Link og basale data for ejerlavet',
        $ref: '#/definitions/EjerlavRef'
      }
    },
    docOrder: ['tekst', 'ejerlav']
  }),
  fields: autocompleteFields,
  mapper: function (baseUrl) {
    return function(row) {
      return {
        tekst: '' + row.kode + ' ' + row.navn,
        ejerlav: {
          href: makeHref(baseUrl, 'ejerlav', [row.kode]),
          kode: row.kode,
          navn: row.navn
        }
      };
    };
  }
};

exports.json = {
  schema: globalSchemaObject({
    'title': 'ejerlav',
    'properties': {
      'href': {
        description: 'Ejerlavets unikke URL.',
        $ref: '#/definitions/Href'
       },
      'kode': normalizedFieldSchema('kode'),
      'navn' : normalizedFieldSchema('navn'),
      bbox: {
        description: 'Ejerlavets bounding box.',
        $ref: '#/definitions/NullableBbox'
      },
      visueltcenter: {
        description: 'Ejerlavets visuelle center.',
        $ref: '#/definitions/VisueltCenter'
      }
    },
    docOrder: ['href', 'kode', 'navn', 'bbox', 'visueltcenter']
  }),
  fields: _.where(fields, {'selectable' : true}),
  mapper: function(baseUrl) {
    return function(row) {
      return {
        href: makeHref(baseUrl, 'ejerlav', [row.kode]),
        kode: row.kode,
        navn: row.navn,
        bbox: commonMappers.mapBbox(row),
        visueltcenter: commonMappers.mapVisueltCenter(row)
      };
    };
  }
};

const geomJsonField = _.findWhere(fields, {name: 'geom_json'});
representationUtil.addGeojsonRepresentations(exports, geomJsonField);

const registry = require('../registry');
registry.addMultiple('ejerlav', 'representation', module.exports);
