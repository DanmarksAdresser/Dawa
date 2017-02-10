"use strict";

const namesAndKeys = require("./namesAndKeys");
const representationsMap = require('./representations');
const sqlModels = require('./sqlModels');
const resourcesUtil = require('../common/resourcesUtil');
const commonParameters = require('../common/commonParameters');
const registry = require('../registry');
const parametersMap = require('./parameters');
const oisApiModels = require('./oisApiModels');

for(let oisModelName of Object.keys(namesAndKeys)) {
  const nameAndKey = namesAndKeys[oisModelName];
  const representations = representationsMap[oisModelName];
  const sqlModel = sqlModels[oisModelName];
  const apiModel = oisApiModels[oisModelName];
  const queryParameters = Object.assign({}, {
    crs: commonParameters.crs,
    struktur: commonParameters.struktur,
    format: commonParameters.format,
    paging: commonParameters.paging
  }, parametersMap[oisModelName]);
  if(apiModel.geojson) {
    queryParameters.geomWithin =commonParameters.geomWithin;
    queryParameters.reverseGeocoding = commonParameters.reverseGeocodingOptional;
  }
  const queryResource = {
    path: '/ois/' + nameAndKey.plural,
    pathParameters: [],
    queryParameters: resourcesUtil.flattenParameters(queryParameters),
    representations: representations,
    sqlModel: sqlModel,
    singleResult: false,
    chooseRepresentation: resourcesUtil.chooseRepresentationForQuery,
    processParameters: resourcesUtil.applyDefaultPagingForQuery
  };

  registry.add(`ois_${oisModelName}`, 'resource', 'query', queryResource);
}
