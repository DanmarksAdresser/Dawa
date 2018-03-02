"use strict";

const _ = require('underscore');
// const globalSchemaObject = require('../../commonSchemaDefinitionsUtil').globalSchemaObject;
// const normalizedFieldSchemas = require('../normalizedFieldSchemas');
const fields = require('./fields');
const representationUtil = require('../../common/representationUtil');

module.exports = {
  json: {
    // schema: schema,
    fields: fields,
    mapper: function(baseUrl, params) {
      return (row) =>  {
        return row;
      }
    }
  },
  flat: {
    fields: fields,
    outputFields: _.pluck(fields, 'name'),
    mapper: function (baseUrl, params) {
      return representationUtil.defaultFlatMapper(fields);
    }
  }
};