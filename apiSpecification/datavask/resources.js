"use strict";

var parameters = require('./parameters');
var registry = require('../registry');
var representationsMap = require('./representations');
var resourcesUtil = require('../common/resourcesUtil');
var sqlModels = require('./sqlModel');

['adgangsadresse', 'adresse'].forEach((entityName) => {
  var resource =  {
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

