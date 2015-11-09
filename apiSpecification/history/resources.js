"use strict";

var commonParameters = require('../common/commonParameters');
var parameters = require('./parameters');
var registry = require('../registry');
var representationsMap = require('./representations');
var resourcesUtil = require('../common/resourcesUtil');
var sqlModels = require('./sqlModels');

['adgangsadresse', 'adresse'].forEach((entityName) => {
  var resource =  {
    path: `/historik/${entityName}r`,
    pathParameters: [],

    queryParameters: resourcesUtil.flattenParameters(parameters).concat(commonParameters.paging)
      .concat(commonParameters.format),
    representations: representationsMap[entityName],
    sqlModel: sqlModels[entityName],
    singleResult: false,
    processParameters: resourcesUtil.applyDefaultPagingForQuery,
    chooseRepresentation: resourcesUtil.chooseRepresentationForQuery
  };
  registry.add(`history_${entityName}`, 'resource', 'query', resource);
});
