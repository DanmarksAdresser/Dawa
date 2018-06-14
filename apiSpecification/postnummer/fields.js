"use strict";

var fieldsUtil = require('../common/fieldsUtil');
var sqlModel = require('./sqlModel');

var normalizedFieldSchemas = require('../replikering/normalizedFieldSchemas');
const commonMappers = require('../commonMappers');

var normalizedField = function(fieldName) {
  return normalizedFieldSchemas.normalizedField('postnummer', fieldName);
};

var fields = [
  normalizedField('nr'),
  normalizedField('navn'),
  {
    name: 'kommunekode'
  },
  {
    name: 'stormodtager'
  },
  {
    name: 'stormodtageradresser'
  },
  {
    name: 'geom_json'
  },
  {
    name: 'kommuner',
    multi: true
  },
  {
    name: 'bbox',
    selectable: true,
    formatter: commonMappers.mapBbox
  }];

fieldsUtil.applySelectability(fields, sqlModel);
fieldsUtil.normalize(fields);
module.exports =  fields;
