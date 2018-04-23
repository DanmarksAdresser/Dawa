"use strict";


const fieldsUtil = require('../common/fieldsUtil');
const stedFields = require('../sted/fields');
const sqlModel = require('./sqlModel');

module.exports = [
  ...stedFields.map(field => Object.assign({}, field, {name: `sted_${field.name}`})),
  {
    name: 'navn',
  },
  {
    name: 'brugsprioritet'
  },
  {
    name: 'navnestatus'
  }
];

fieldsUtil.applySelectability(module.exports, sqlModel);
fieldsUtil.normalize(module.exports);
