"use strict";

const fieldsUtil = require('../common/fieldsUtil');
const sqlModel = require('./sqlModel');

const normalizedFieldSchemas = require('../replikering/normalizedFieldSchemas');

const normalizedField = function(fieldName) {
  return normalizedFieldSchemas.normalizedField('postnummer', fieldName);
};

const { numberToString } = require('../util');


const fields = [
  normalizedField('nr'),
  normalizedField('navn'),
  {
    name: 'kommunekode'
  },
  {
    name: 'stormodtager'
  },
  {
    name: 'stormodtageradresser'
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
    name: 'ændret'
  },
  {
    name: 'geo_ændret'
  },
  {
    name: 'geo_version'
  },
  {
    name: 'dagi_id',
    formatter: numberToString
  }];

fieldsUtil.applySelectability(fields, sqlModel);
fieldsUtil.normalize(fields);
module.exports =  fields;
