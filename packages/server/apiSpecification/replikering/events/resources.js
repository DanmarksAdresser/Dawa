"use strict";

var _ = require('underscore');

var parameters = require('./parameters');
var representations = require('./representations');
var sqlModels = require('./sqlModels');
var resourcesUtil = require('../../common/resourcesUtil');
require('../../allNamesAndKeys');
var registry = require('../../registry');
var commonParameters = require('../../common/commonParameters');
const datamodel = require('../datamodel');
const bindings = require('../dbBindings');
const commonReplikeringParams = require('../commonParameters');

_.each(Object.keys(datamodel), function(entityName) {
  const binding = bindings[entityName];
  exports[entityName] = {
    path: `${binding.path}/haendelser`,
    pathParameters: [],
    queryParameters: resourcesUtil.flattenParameters({
      keyParameters: parameters.keyParameters[entityName] || [],
      additionalParameters: binding.additionalParameters || [],
      sekvensnummer: parameters.sekvensnummer,
      tidspunkt: parameters.tidspunkt,
      txid: commonReplikeringParams.txid,
      txidInterval: parameters.txidInterval,
      formatParameters: commonParameters.format
    }),
    representations: representations[entityName],
    sqlModel: sqlModels[entityName],
    singleResult: false,
    chooseRepresentation: resourcesUtil.chooseRepresentationForQuery,
    processParameters:  function() {}
  };
  if(binding.legacyResource) {
    registry.add(entityName, 'resource', 'hændelser', exports[entityName]);
  }
});