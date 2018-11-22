"use strict";

const _ = require('underscore');

const oisModels = require('./oisModels');

exports.dawaTableName = (oisEntityName) => {
  return `ois_${oisEntityName}`;
};

exports.oisTableName = oisEntityName => oisModels[oisEntityName].oisTable;

exports.postgresColumnNames = _.mapObject(oisModels, (model) => {
  return _.pluck(model.fields, 'name').concat(_.pluck(model.derivedFields, 'name'))
});

exports.oisFieldNames = oisEntityName => _.pluck(oisModels[oisEntityName].fields, 'name');


exports.dataModels = Object.keys(oisModels).reduce((memo, modelName) => {
  const model = oisModels[modelName];
  memo[modelName] = {
    name: modelName,
    table: exports.oisTableName(modelName),
    key: model.key,
    columns: exports.postgresColumnNames[modelName]
  };
  return memo;
}, {});
