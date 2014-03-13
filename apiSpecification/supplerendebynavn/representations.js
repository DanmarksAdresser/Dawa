"use strict";

var _ = require('underscore');

var flatRepresentationUtil = require('../common/flatRepresentationUtil');
var fields = require('./fields');
var commonMappers = require('../commonMappers');
var commonSchemaDefinitionsUtil = require('../commonSchemaDefinitionsUtil');

var globalSchemaObject = commonSchemaDefinitionsUtil.globalSchemaObject;
var makeHref = commonMappers.makeHref;
var mapPostnummerRefArray = commonMappers.mapPostnummerRefArray;
var mapKommuneRefArray = commonMappers.mapKommuneRefArray;

var flatFields = flatRepresentationUtil.flatCandidateFields(fields);

exports.flat = {
  fields: flatFields,
  mapper: function(baseUrl, params) {
    return flatRepresentationUtil.defaultFlatMapper(flatFields);
  }
};

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
  mapper: function(baseUrl, params) {
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

exports.autocomplete = {
  fields: _.where(fields, {name: 'navn'}),
  schema: globalSchemaObject({
    properties: {
      tekst: {
        description: 'Det supplerende bynavn.',
        type: 'string'
      },
      supplerendebynavn: {
        description: 'Link og basale data for det supplerende bynavn.',
        $ref: '#/definitions/SupplerendeBynavnRef'
      }
    },
    docOrder: ['tekst', 'supplerendebynavn']
  }),
  mapper: function(baseUrl, params) {
    return function(row) {
      return {
        tekst: row.navn,
        supplerendebynavn: {
          href:  makeHref(baseUrl, 'supplerendebynavn', [row.navn]),
          navn: row.navn
        }
      };
    };
  }
};


