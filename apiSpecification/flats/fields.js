"use strict";

const _ = require('underscore');

const fieldsUtil = require('../common/fieldsUtil');
const flats = require('./flats');
const sqlModels = require('./sqlModels');

module.exports = _.mapObject(flats, (flat, flatName) => {
  const sqlModel = sqlModels[flatName];
  const fields = flat.fields.concat([
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
    }]);
  fieldsUtil.applySelectability(fields, sqlModel);
  fieldsUtil.normalize(fields);
  return fields;
});

