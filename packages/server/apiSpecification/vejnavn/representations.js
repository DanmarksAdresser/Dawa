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

const miniSchema = globalSchemaObject({
  properties: {
    navn: {
      type: 'string',
      description: 'Vejnavnet.'
    },
    betegnelse: {
      type: 'string',
      description: 'Tekstbeskrivelse af det vejnavnet - identisk med navn'
    },
    href: {
      type: 'string',
      description: 'Det vejnavnets URL.'
    }
  },
  docOrder: ['href', 'navn', 'betegnelse']
});

exports.mini = representationUtil.miniRepresentation(['navn'], fields,
  miniSchema,
  (baseUrl, row) => makeHref(baseUrl, 'vejnavn', [row.navn]),
  row => row.navn
);

exports.autocomplete = representationUtil.autocompleteRepresentation(exports.mini, 'vejnavn');


exports.json = {
  fields: _.where(fields, { selectable: true }),
  schema: globalSchemaObject({
    'title': 'vejnavn',
    'properties': {
      href: {
        description: 'Vejnavnets unikke URL.',
        $ref: '#/definitions/Href'
      },
      'navn': {
        description: 'Vejnavnet',
        type: 'string'
      },
      'postnumre': {
        description: 'De postnumre, hvori der ligger en vej med dette navn.',
        type: 'array',
        items: {
          $ref: '#/definitions/PostnummerRef'
        }
      },
      'kommuner': {
        description: 'De kommuner hvori der ligger en vej med dette navn.',
        type: 'array',
        items: { '$ref': '#/definitions/KommuneRef'}
      }
    },
    docOrder: ['href', 'navn', 'postnumre', 'kommuner']
  }),
  mapper: function (baseUrl) {
    return function(row) {
      return {
        href: makeHref(baseUrl, 'vejnavn', [row.navn]),
        navn: row.navn,
        postnumre: mapPostnummerRefArray(row.postnumre, baseUrl),
        kommuner: mapKommuneRefArray(row.kommuner, baseUrl)
      };
    };
  }
};

const registry = require('../registry');
registry.addMultiple('vejnavn', 'representation', module.exports);