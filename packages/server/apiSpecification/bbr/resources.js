const registry = require("../registry");
const grbbrModels = require('../../ois2/parse-ea-model');
const {getQueryPath, getEntityName} = require('./common');
const representations = require('./representations');
const sqlModels = require('./sqlModels');
const resourcesUtil = require('../common/resourcesUtil');
const commonParameters = require('../common/commonParameters');
const parameterMap = require('./parameters');
for (let grbbrModel of grbbrModels) {
  const queryParameters = {
    propertyFilter: parameterMap[grbbrModel.name].propertyFilter,
    struktur: commonParameters.struktur,
    format: commonParameters.format,
    paging: commonParameters.paging,
    crs: commonParameters.crs
  };
  const sqlModel = sqlModels[grbbrModel.name];
  const queryResource = {
    path: getQueryPath(grbbrModel.name),
    pathParameters: parameterMap[grbbrModel.name].propertyFilter.map(param => ({
      name: param.name,
      doc: `Returner resultater med de(n) angivne værdi(er) for ${param.name}`
    })),
    queryParameters: resourcesUtil.flattenParameters(queryParameters),
    representations: representations[grbbrModel.name],
    sqlModel,
    chooseRepresentation: resourcesUtil.chooseRepresentationForQuery,
    processParameters: resourcesUtil.applyDefaultPaging
  };

  const getByKeyPath = `${getQueryPath(grbbrModel.name)}/:id`;
  const getByKeyResource = {
    path: getByKeyPath,
    pathParameters: parameterMap[grbbrModel.name].id,
    queryParameters: resourcesUtil.flattenParameters(
      Object.assign({},
        {format: commonParameters.format},
        {
          crs: commonParameters.crs,
          struktur: commonParameters.struktur,
        })),
    representations: representations,
    sqlModel,
    singleResult: true,
    processParameters: () => null,
    chooseRepresentation: resourcesUtil.chooseRepresentationForQuery
  };

  registry.add(getEntityName(grbbrModel), 'resource', 'query', queryResource);
  registry.add(getEntityName(grbbrModel), 'resource', 'getByKey', getByKeyResource);

}