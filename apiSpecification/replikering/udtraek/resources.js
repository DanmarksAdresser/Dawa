"use strict";


const sqlModels = require('./sqlModels');
const representations = require('./representations');
const parameters = require('./parameters');
const resourcesUtil = require('../../common/resourcesUtil');
const commonParameters = require('../../common/commonParameters');
const datamodels = require('../datamodel');
const bindings = require('../dbBindings');
const registry = require('../../registry');

require('../../allNamesAndKeys');

module.exports = Object.keys(datamodels).reduce((memo, datamodelName) => {
  const datamodel = datamodels[datamodelName];
  const binding = bindings[datamodelName];
  if(!binding.legacyResource) {
    return memo;
  }
  memo[datamodelName]=
  {
    path: datamodel.path,
      pathParameters: [],
    queryParameters: resourcesUtil.flattenParameters({
      sekvensnummer: parameters.sekvensnummer,
      formatParameters: commonParameters.format
    }),
    representations: representations[datamodelName],
    sqlModel: sqlModels[datamodelName],
    singleResult: false,
    processParameters: function(params) {
    },
    chooseRepresentation: resourcesUtil.chooseRepresentationForQuery
  };
  registry.add(datamodelName, 'resource', 'udtraek', memo[datamodelName]);
  return memo;
}, {});