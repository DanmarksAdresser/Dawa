"use strict";

var fieldsUtil = require('../common/fieldsUtil');

var kode4String = require('../util').kode4String;

var fields = [
  {
    name: 'kode',
    formatter: kode4String,
    selectable: true
  },
  {
    name: 'navn',
    selectable: true
  },
  {
    name: 'geom_json',
    selectable: true
  }
];

fieldsUtil.normalize(fields);
module.exports =  fields;