"use strict";


const fieldsUtil = require('../common/fieldsUtil');
const sqlModel = require('./sqlModel');

module.exports = [
  {
    name: 'id'
  },
  {
    name: 'hovedtype'
  },
  {
    name: 'undertype'
  },
  {
    name: 'navn'
  },
  {
    name: 'navnestatus'
  },
  {
    name: 'bebyggelseskode'
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
  },
  {
    name: 'kommuner',
    multi: true
  },
  {
    name: 'visueltcenter'
  },
  {
    name: 'visueltcenter_x'
  },
  {
    name: 'visueltcenter_y'
  }];

fieldsUtil.applySelectability(module.exports, sqlModel);
fieldsUtil.normalize(module.exports);
