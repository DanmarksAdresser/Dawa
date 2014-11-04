"use strict";

var _ = require('underscore');

var representationUtil = require('../common/representationUtil');
var fields = require('./fields');
var commonMappers = require('../commonMappers');
var commonSchemaDefinitionsUtil = require('../commonSchemaDefinitionsUtil');
var util = require('../util');
var normalizedFieldSchemas = require('../replikering/normalizedFieldSchemas');

var normalizedFieldSchema = function(fieldName) {
  return normalizedFieldSchemas.normalizedSchemaField('ejerlav', fieldName);
};


var d = util.d;
var globalSchemaObject = commonSchemaDefinitionsUtil.globalSchemaObject;
var makeHref = commonMappers.makeHref;

exports.flat = representationUtil.defaultFlatRepresentation(fields);

var autocompleteFieldNames = ['navn', 'kode'];
var autocompleteFields = _.filter(fields, function(field) {
  return _.contains(autocompleteFieldNames, field.name);
});

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
      'navn' : normalizedFieldSchema('navn')
    },
    docOrder: ['href', 'kode', 'navn']
  }),
  fields: _.where(fields, {'selectable' : true}),
  mapper: function(baseUrl) {
    return function(row) {
      return {
        href: makeHref(baseUrl, 'ejerlav', [row.kode]),
        kode: row.kode,
        navn: row.navn
      };
    };
  }
};

var registry = require('../registry');
registry.addMultiple('ejerlav', 'representation', module.exports);