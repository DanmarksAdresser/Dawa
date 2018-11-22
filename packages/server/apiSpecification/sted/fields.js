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
    name: 'indbyggerantal'
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
    name: 'primærtnavn'
  },
  {
    name: 'primærnavnestatus'
  },
  {
    name: 'sekundærenavne',
    multi: true
  },
  {
    name: 'geom_json'
  },
  {
    name: 'kommuner',
    multi: true
  },
  {
    name: 'bbox_xmin'
  },
  {
    name: 'bbox_ymin'
  },
  {
    name: 'bbox_xmax'
  },
  {
    name: 'bbox_ymax'
  },
  {
    name: 'visueltcenter_x'
  },
  {
    name: 'visueltcenter_y'
  },
  {
    name: 'brofast'
  }];

fieldsUtil.applySelectability(module.exports, sqlModel);
fieldsUtil.normalize(module.exports);
