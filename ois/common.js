"use strict";

const _ = require('underscore');

const oisModels = require('./oisModels');

exports.dawaTableName = (oisEntityName) => {
  return `ois_${oisEntityName}`;
};

exports.oisTableName = oisEntityName => oisModels[oisEntityName].oisTable;

exports.columnNames = oisEntityName => _.pluck(oisModels[oisEntityName].fields, 'name');
