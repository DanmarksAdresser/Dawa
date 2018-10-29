var parameters = require('./parameters');
const registry = require('../registry');
const representations = require('./representations');
const resourcesUtil = require('../common/resourcesUtil');
const sqlModel = require('./sqlModel');

module.exports =  {
  path: `/darhistorik`,
  pathParameters: [],
  queryParameters: resourcesUtil.flattenParameters(parameters),
  representations,
  sqlModel,
  singleResult: true,
  processParameters: function() {},
  chooseRepresentation: resourcesUtil.chooseRepresentationForQuery
};

registry.add(`adressehistorik`, 'resource', 'adresse', module.exports);
