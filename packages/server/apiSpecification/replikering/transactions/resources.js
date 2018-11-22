var parameters = require('./parameters');
var representations = require('./representations');
var sqlModel = require('./sqlModel');
var resourcesUtil = require('../../common/resourcesUtil');
require('../../allNamesAndKeys');
var registry = require('../../registry');
var commonParameters = require('../../common/commonParameters');


module.exports = {
  query: {
    path: `/replikering/transaktioner`,
    pathParameters: [],
    queryParameters: resourcesUtil.flattenParameters({
      propertyFilter: parameters.propertyFilter,
      txidInterval: parameters.txidInterval,
      formatParameters: commonParameters.format,
      pagingParameters: commonParameters.paging
    }),
    representations: representations,
    sqlModel: sqlModel.query,
    singleResult: false,
    chooseRepresentation: resourcesUtil.chooseRepresentationForQuery,
    processParameters:  resourcesUtil.applyDefaultPagingForQuery
  },
  seneste: {
    path: '/replikering/senestetransaktion',
    pathParameters: [],
    queryParameters: resourcesUtil.flattenParameters({
      formatParameters: commonParameters.format
    }),
    representations: representations,
    sqlModel: sqlModel.latest,
    singleResult: true,
    chooseRepresentation: resourcesUtil.chooseRepresentationForQuery,
    processParameters:  function(params) {
    }
  }
};

registry.addMultiple('transaktion', 'resource', module.exports);