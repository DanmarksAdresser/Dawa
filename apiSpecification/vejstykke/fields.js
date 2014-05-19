"use strict";

var fieldsUtil = require('../common/fieldsUtil');
var sqlModel = require('./sqlModel');

var util = require('../util');
var kode4String = util.kode4String;
var d = util.d;


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
    name: 'oprettet',
    formatter: d
  },
  {
    name: 'ændret',
    formatter: d
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
