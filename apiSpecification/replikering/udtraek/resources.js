"use strict";

var _ = require('underscore');

var sqlModels = require('./sqlModels');
var columnMappings = require('../columnMappings');
var representations = require('./representations');
var parameters = require('./parameters');
var resourcesUtil = require('../../common/resourcesUtil');

require('../../allNamesAndKeys');
var registry = require('../../registry');

module.exports = _.reduce(Object.keys(columnMappings), function(memo, datamodelName) {
  var nameAndKey = registry.findWhere({
    entityName: datamodelName,
    type: 'nameAndKey'
  });

  memo[datamodelName]=
  {
    path: '/replikering/' + nameAndKey.plural,
      pathParameters: [],
    queryParameters: parameters.sekvensnummer,
    representations: representations[datamodelName],
    sqlModel: sqlModels[datamodelName],
    singleResult: false,
    processParameters: function(params) {
      params.format = 'csv';
    },
    chooseRepresentation: resourcesUtil.chooseRepresentationForQuery
  };
  return memo;
}, {});

_.each(module.exports, function(resource, key) {
  registry.add(key, 'resource', 'udtraek', resource);
});
