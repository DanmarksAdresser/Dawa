"use strict";

var fieldsUtil = require('../common/fieldsUtil');
var sqlModel = require('./sqlModel');

var fields = [
  {
    name: 'navn'
  },
  {
    name: 'kommunekode'
  },
  {
    name: 'postnr'
  },
  {
    name: 'kommuner',
    multi: true
  },
  {
    name: 'postnumre',
    multi: true
  }
];

fieldsUtil.applySelectability(fields, sqlModel);
fieldsUtil.normalize(fields);
module.exports =  fields;
