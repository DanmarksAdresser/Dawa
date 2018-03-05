"use strict";


const sqlModels = require('./sqlModels');
const representations = require('./representations');
const resourcesUtil = require('../../common/resourcesUtil');
const commonParameters = require('../../common/commonParameters');
const commonReplikeringParameters = require("../commonParameters");
const datamodels = require('../datamodel');
const bindings = require('../dbBindings');
const registry = require('../../registry');

require('../../allNamesAndKeys');

module.exports = Object.keys(datamodels).reduce((memo, datamodelName) => {
  const binding = bindings[datamodelName];
  memo[datamodelName]=
  {
    path: binding.path,
      pathParameters: [],
    queryParameters: [...commonReplikeringParameters.sekvensnummer,
      ...commonParameters.format]
    ,
    representations: representations[datamodelName],
    sqlModel: sqlModels[datamodelName],
    singleResult: false,
    processParameters: function(params) {
    },
    chooseRepresentation: resourcesUtil.chooseRepresentationForQuery
  };
  if(binding.legacyResource) {
    registry.add(datamodelName, 'resource', 'udtraek', memo[datamodelName]);
  }
  return memo;
}, {});