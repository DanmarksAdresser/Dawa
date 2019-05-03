"use strict";

const registry = require('../../registry');
const replikeringModels = require('../datamodel');

const entities = Object.keys(replikeringModels);
entities.sort();
const externalModel = entities.reduce((memo, entityName) => {
  const model = replikeringModels[entityName];
  memo[entityName] = Object.assign({}, {
    key: model.key,
    attributes: model.attributes.map(attr => Object.assign(
      {},
      {
        name: attr.name,
        type: attr.type,
        nullable: !!attr.nullable,
        description: attr.description,
        offloaded: attr.offloaded || undefined
      }))
  });
  return memo;
}, {});

const handler = (req, res) => res.contentType('application/json').send(JSON.stringify(externalModel, null, 2));

module.exports = {
  path: '/replikering/datamodel',
  handler,
  parameters: []
};

registry.add('replikering', 'expressHandler', 'datamodel', module.exports);

