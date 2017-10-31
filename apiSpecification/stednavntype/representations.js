"use strict";

const representationUtil = require('../common/representationUtil');
const fields = require('./fields');
const  { makeHref } = require('../commonMappers');
const { globalSchemaObject } =  require('../commonSchemaDefinitionsUtil');
const registry = require('../registry');


const fieldsExcludedFromFlat = ['undertyper'];
const flatFields = representationUtil.fieldsWithoutNames(fields, fieldsExcludedFromFlat);

exports.flat = representationUtil.defaultFlatRepresentation(flatFields);

exports.json = {
  schema: globalSchemaObject({
    'title': 'stednavntype',
    'properties': {
      'href': {
        description: 'stednavntypens unikke URL.',
        '$ref': '#/definitions/Href'
      },
      'hovedtype': {
        type: 'string',
        description: 'Hovedtypen.'
      },
      undertyper: {
        type: 'array',
        description: 'Undertyper for hovedtypen.',
        items: {
          type: 'string',
          description: 'Undertypens navn'
        }
      }
    },
    'docOrder': ['hovedtype', 'href', 'undertyper']
  }),
  fields: fields,
  mapper: function (baseUrl) {
    return function (row) {
      return {
        href: makeHref(baseUrl, 'stednavntype', [row.hovedtype]),
        hovedtype: row.hovedtype,
        undertyper: row.undertyper,
      };
    };
  }
};

registry.addMultiple('stednavntype', 'representation', module.exports);
