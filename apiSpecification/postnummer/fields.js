"use strict";

var fieldsUtil = require('../common/fieldsUtil');
var sqlModel = require('./sqlModel');

var kode4String = require('../util').kode4String;

var fields = [
  {
    name: 'nr',
    formatter: kode4String
  },
  {
    name: 'navn'
  },
  {
    name: 'version'
  },
  {
    name: 'kommune'
  },
  {
    name: 'geom_json'
  },
  {
    name: 'kommuner',
    multi: true
  }
];

fieldsUtil.applySelectability(fields, sqlModel);
fieldsUtil.normalize(fields);
module.exports =  fields;