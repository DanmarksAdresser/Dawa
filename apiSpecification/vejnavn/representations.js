"use strict";

var _ = require('underscore');

var representationUtil = require('../common/representationUtil');
var fields = require('./fields');
var commonMappers = require('../commonMappers');
var commonSchemaDefinitionsUtil = require('../commonSchemaDefinitionsUtil');

var globalSchemaObject = commonSchemaDefinitionsUtil.globalSchemaObject;
var makeHref = commonMappers.makeHref;
var mapPostnummerRefArray = commonMappers.mapPostnummerRefArray;
var mapKommuneRefArray = commonMappers.mapKommuneRefArray;

var flatFields = representationUtil.flatCandidateFields(fields);

exports.flat = {
  fields: flatFields,
  outputFields: _.pluck(flatFields, 'name'),
  mapper: function(baseUrl, params) {
    return representationUtil.defaultFlatMapper(flatFields);
  }
};

exports.autocomplete = {
  schema: globalSchemaObject({
    properties: {
      tekst: {
        description: 'Vejnavnet',
        type: 'string'
      },
      vejnavn: {
        description: 'Link og basale data for vejnavnet',
        $ref: '#/definitions/VejnavnRef'
      }
    },
    docOrder: ['tekst', 'vejnavn']
  }),
  fields: _.where(fields, { name: 'navn' }),
  mapper: function (baseUrl, params) {
    return function(row) {
      return {
        tekst: row.navn,
        vejnavn: {
          href: makeHref(baseUrl, 'vejnavn', [row.navn]),
          navn: row.navn
        }
      };
    };
  }
};

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
  mapper: function (baseUrl, params) {
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
