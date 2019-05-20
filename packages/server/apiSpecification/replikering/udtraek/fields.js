"use strict";

const datamodels = require('../datamodel');
module.exports = Object.keys(datamodels).reduce((memo, datamodelName) => {
  const model = datamodels[datamodelName];

  // The fields specific for this entity are retrieved from the SQL model,
  // because there is a 1-1 correspondence between the internal and external model
  // on the replication APIs.
  const entityFields = model.attributes.map(field => ({
    name: field.name,
    selectable: true,
    multi: false
  }));

  memo[datamodelName] = entityFields;
  return memo;

}, {});