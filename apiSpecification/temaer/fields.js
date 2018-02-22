"use strict";

const fieldsUtil = require('../common/fieldsUtil');
const temaModels = require('../../dagiImport/temaModels');
const sqlModels = require('./sqlModels');

const fieldMap = temaModels.modelList.filter(model => model.published).reduce((memo, model) => {
  const result = fieldsUtil.normalize([
    ...model.fields,
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
      name: 'geom_json',
      selectable: true
    }]);
  fieldsUtil.applySelectability(result, sqlModels[model.singular]);
  memo[model.singular] = result;
  return memo;
}, {});

module.exports = fieldMap;