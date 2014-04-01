"use strict";

var fieldsUtil = require('../common/fieldsUtil');
var sqlModel = require('./sqlModel');

var kode4String = require('../util').kode4String;


var fields = [
  {
    name: 'kode',
    formatter: kode4String
  },
  {
    name: 'kommunekode',
    formatter: kode4String
  },
  {
    name: 'kommunenavn'
  },
  {
    name: 'navn'
  },
  {
    name: 'adresseringsnavn'
  },
  {
    name: 'postnr'
  },
  {
    name: 'postnumre',
    multi: true
  }
];

fieldsUtil.applySelectability(fields, sqlModel);
fieldsUtil.normalize(fields);
module.exports =  fields;
