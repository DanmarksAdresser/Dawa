"use strict";

const _ = require('underscore');

const fieldsUtil = require('../common/fieldsUtil');
const flats = require('./flats');
const sqlModels = require('./sqlModels');
module.exports = _.mapObject(flats, (flat, flatName) => {
  const sqlModel = sqlModels[flatName];
  const fields = [
    ...flat.fields,
    ...flat.secondaryFields,
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
    }
  ];
  fieldsUtil.applySelectability(fields, sqlModel);
  fieldsUtil.normalize(fields);
  return fields;
});
