"use strict";

const temaModels = require('../../dagiImport/temaModels');
const registry = require('../registry');

temaModels.modelList.forEach(model =>  {
  exports[model.singular] = {
    singular: model.singular,
    plural: model.plural,
    key: model.primaryKey,
    path: model.path
  };
  registry.add(model.singular, 'nameAndKey', undefined, exports[model.singular]);
});