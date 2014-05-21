"use strict";

var _ = require('underscore');

var parameters = require('./parameters');
var representations = require('./representations');
var sqlModels = require('./sqlModels');
var resourcesUtil = require('../common/resourcesUtil');
require('../allNamesAndKeys');
var registry = require('../registry');

_.each(['vejstykke'], function(entityName) {
  var nameAndKey = registry.findWhere({
    entityName: entityName,
    type: 'nameAndKey'
  });
  exports[entityName] = {
    hændelser:   {
      path: '/replikering/' + nameAndKey.plural + '/haendelser',
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