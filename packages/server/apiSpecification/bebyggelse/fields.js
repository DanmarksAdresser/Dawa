"use strict";


const fieldsUtil = require('../common/fieldsUtil');
const sqlModel = require('./sqlModel');

module.exports = [
  {
    name: 'id'
  },
  {
    name: 'type'
  },
  {
    name: 'navn'
  },
  {
    name: 'kode'
  },
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
    name: 'geom_json'
  }];

fieldsUtil.applySelectability(module.exports, sqlModel);
fieldsUtil.normalize(module.exports);
