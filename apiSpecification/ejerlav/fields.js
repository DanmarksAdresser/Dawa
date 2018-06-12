"use strict";

var fieldsUtil = require('../common/fieldsUtil');
var sqlModel = require('./sqlModel');

var normalizedFieldSchemas = require('../replikering/normalizedFieldSchemas');

var normalizedField = function(fieldName) {
  return normalizedFieldSchemas.normalizedField('ejerlav', fieldName);
};


var fields = [
  normalizedField('kode'),
  normalizedField('navn'),
  {
    name: 'geom_json',
    selectable: true
  }

];

fieldsUtil.applySelectability(fields, sqlModel);
fieldsUtil.normalize(fields);

module.exports =  fields;
