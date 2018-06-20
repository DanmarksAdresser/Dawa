"use strict";

var fieldsUtil = require('../common/fieldsUtil');
var sqlModel = require('./sqlModel');

var normalizedFieldSchemas = require('../replikering/normalizedFieldSchemas');

var normalizedField = function(fieldName) {
  return normalizedFieldSchemas.normalizedField('postnummer', fieldName);
};

var fields = [
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
  }];

fieldsUtil.applySelectability(fields, sqlModel);
fieldsUtil.normalize(fields);
module.exports =  fields;
