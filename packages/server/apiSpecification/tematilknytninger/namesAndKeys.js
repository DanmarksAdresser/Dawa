"use strict";

const _ = require('underscore');
const temaModels = require('../../dagiImport/temaModels');
const registry = require('../registry');

module.exports = temaModels.modelList.reduce(function(memo, model) {
  const name = model.tilknytningName;
  memo[name] = {
    singular: name,
    plural: name + 'er',
    key: model.tilknytningKey
  };
  return memo;
}, {});

_.each(module.exports, function(nameAndKey) {
  registry.add(nameAndKey.singular, 'nameAndKey', undefined, nameAndKey);
});