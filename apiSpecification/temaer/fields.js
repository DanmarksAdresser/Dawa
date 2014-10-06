"use strict";

var _ = require('underscore');

var fieldsUtil = require('../common/fieldsUtil');


var additionalFields = require('./additionalFields');
var fieldMap = _.reduce(additionalFields, function (memo, fields, temaNavn) {
  memo[temaNavn] = fields.concat([
    {
      name: 'ændret',
      selectable: true
    },
    {
      name: 'geo_ændret',
      selectable: true
    },
    {
      name: 'geo_version',
      selectable: true
    },
    {
      name: 'geom_json',
      selectable: true
    }
  ]);
  return memo;
}, {});

module.exports = _.each(fieldMap, function(fields, temaNavn) {
  fieldsUtil.normalize(fields);
});
