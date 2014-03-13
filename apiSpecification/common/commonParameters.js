"use strict";

var schema = require('../parameterSchema');
exports.paging = [
  {
    name: 'side',
    type: 'integer',
    schema: schema.positiveInteger
  },
  {
    name: 'per_side',
    type: 'integer',
    schema: schema.positiveInteger
  }
];

exports.format = [
  {
    name: 'format',
    schema: {
      "enum": ['csv', 'json', 'geojson']
    }
  },
  {
    name: 'callback',
    schema: {
      type: 'string',
      pattern: '^[\\$_a-zA-Z0-9]+$'
    }
  }
];

exports.search = [
  {
    name: 'q',
    type: 'string',
    renameTo: 'search'
  }
];

exports.autocomplete = [
  {
    name: 'q',
    type: 'string',
    renameTo: 'autocomplete'
  }
];