"use strict";

const parameters = require('./parameters');
const registry = require('../registry');
const representationsMap = require('./representations');
const resourcesUtil = require('../common/resourcesUtil');
const sqlModels = require('./sqlModel');

['adgangsadresse', 'adresse'].forEach((entityName) => {
  const resource =  {
    path: `/datavask/${entityName}r`,
    pathParameters: [],

    queryParameters: resourcesUtil.flattenParameters(parameters),
    representations: representationsMap[entityName],
    sqlModel: sqlModels[entityName],
    singleResult: true,
    processParameters: function() {},
    chooseRepresentation: resourcesUtil.chooseRepresentationForQuery
  };

  exports[entityName] = resource;
  registry.add(`${entityName}_datavask`, 'resource', 'datavask', resource);
});

