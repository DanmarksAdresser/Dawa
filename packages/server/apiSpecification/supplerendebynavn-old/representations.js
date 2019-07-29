"use strict";

const _ = require('underscore');

const representationUtil = require('../common/representationUtil');
const fields = require('./fields');
const commonMappers = require('../commonMappers');
const commonSchemaDefinitionsUtil = require('../commonSchemaDefinitionsUtil');

const globalSchemaObject = commonSchemaDefinitionsUtil.globalSchemaObject;
const makeHref = commonMappers.makeHref;
const mapPostnummerRefArray = commonMappers.mapPostnummerRefArray;
const mapKommuneRefArray = commonMappers.mapKommuneRefArray;

exports.flat = representationUtil.defaultFlatRepresentation(fields);

exports.json = {
  fields: _.where(fields, { selectable: true }),
  schema: globalSchemaObject({
    'title': 'supplerendebynavn',
    'properties': {
      href: {
        description: 'Det supplerende bynavns unikke URL',
        $ref: '#/definitions/Href'
      },
      'navn': {
        description: 'Det supplerende bynavn. Indtil 34 tegn. Eksempel: ”Sønderholm”.',
        type: 'string',
        maxLength: 34
      },
      'postnumre': {
        description: 'Postnumre, som det supplerende bynavn er beliggende i.',
        type: 'array',
        items: { '$ref': '#/definitions/PostnummerRef'}
      },
      'kommuner': {
        description: 'Kommuner, som det supplerende bynavn er beliggende i.',
        type: 'array',
        items: { '$ref': '#/definitions/KommuneRef'}
      }
    },
    'docOrder': ['href', 'navn', 'kommuner', 'postnumre']
  }),
  mapper: function(baseUrl) {
    return function(row) {
      return {
        href: makeHref(baseUrl, 'supplerendebynavn', [row.navn]),
        navn: row.navn,
        postnumre: mapPostnummerRefArray(row.postnumre, baseUrl),
        kommuner: mapKommuneRefArray(row.kommuner, baseUrl)
      };
    };
  }
};

const miniSchema = globalSchemaObject({
  properties: {
    navn: {
      type: 'string',
      description: 'Det supplerende bynavns navn'
    },
    betegnelse: {
      type: 'string',
      description: 'Tekstbeskrivelse af det supplerende bynavn - identisk med navn'
    },
    href: {
      type: 'string',
      description: 'Det supplerende bynavns URL.'
    }
  },
  docOrder: ['href', 'navn', 'betegnelse']
});

exports.mini = representationUtil.miniRepresentation(['navn'], fields,
  miniSchema,
  (baseUrl, row) => makeHref(baseUrl, 'supplerendebynavn', [row.navn]),
  row => row.navn
);

exports.autocomplete = representationUtil.autocompleteRepresentation(exports.mini, 'supplerendebynavn');

const registry = require('../registry');
registry.addMultiple('supplerendebynavn-old', 'representation', module.exports);