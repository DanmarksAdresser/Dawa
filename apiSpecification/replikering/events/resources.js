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

_.each(Object.keys(datamodel), function(entityName) {
  const model = datamodel[entityName];
  const binding = bindings[entityName];
  if(!binding.legacyResource) {
    return;
  }
  exports[entityName] = {
    hændelser:   {
      path: `${model.path}/haendelser`,
      pathParameters: [],
      queryParameters: resourcesUtil.flattenParameters({
        keyParameters: parameters.keyParameters[entityName] || [],
        sekvensnummer: parameters.sekvensnummer,
        tidspunkt: parameters.tidspunkt,
        formatParameters: commonParameters.format
      }),
      representations: representations[entityName],
      sqlModel: sqlModels[entityName],
      singleResult: false,
      chooseRepresentation: resourcesUtil.chooseRepresentationForQuery,
      processParameters:  function() {}
    }
  };
});

_.each(exports, function(resources, entityName) {
  registry.add(entityName, 'resource', 'hændelser', resources['hændelser']);
});
