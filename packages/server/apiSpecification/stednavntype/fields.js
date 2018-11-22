"use strict";

const fieldsUtil = require('../common/fieldsUtil');
const sqlModel = require('./sqlModel');



const fields = [
  {
    name: 'hovedtype'
  },
  {
    name: 'undertyper',
    multi: true
  }
];

fieldsUtil.applySelectability(fields, sqlModel);
fieldsUtil.normalize(fields);
module.exports =  fields;
