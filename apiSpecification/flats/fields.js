"use strict";

const _ = require('underscore');

const fieldsUtil = require('../common/fieldsUtil');
const flats = require('./flats');
const sqlModels = require('./sqlModels');

module.exports = _.mapObject(flats, (flat, flatName) => {
  const sqlModel = sqlModels[flatName];
  const fields = flat.fields.concat([{
    name: 'geom_json'
  }]);
  fieldsUtil.applySelectability(fields, sqlModel);
  fieldsUtil.normalize(fields);
  return fields;
});

