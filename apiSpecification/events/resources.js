"use strict";

var _ = require('underscore');

var parameters = require('./parameters');
var representations = require('./representations');
var sqlModels = require('./sqlModels');
var resourcesUtil = require('../common/resourcesUtil');

_.each(['vejstykke'], function(entityName) {
  exports[entityName] = {
    hændelser:   {
      path: '/replikering/' + entityName + '/haendelser',
      pathParameters: [],
      queryParameters: parameters.sekvensnummer,
      representations: representations[entityName],
      sqlModel: sqlModels[entityName],
      singleResult: false,
      chooseRepresentation: resourcesUtil.chooseRepresentationForQuery,
      processParameters:  function() {}
    }
  };
});

var registry = require('../registry');
_.each(exports, function(resources, entityName) {
  registry.add(entityName + '_hændelse', 'resource', 'hændelser', resources['hændelser']);
});