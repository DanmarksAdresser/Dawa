"use strict";

const namesAndKeys = require("./namesAndKeys");
const representationsMap = require('./representations');
const sqlModels = require('./sqlModels');
const resourcesUtil = require('../common/resourcesUtil');
const commonParameters = require('../common/commonParameters');
const registry = require('../registry');
const parametersMap = require('./parameters');
const oisApiModels = require('./oisApiModels');
const {noCacheStrategy} = require('../common/caching');
const oisPaths = {
  'public': '/bbrlight',
  full: '/ois'
};

for(let variant of ['public', 'full']) {
  for(let oisModelName of Object.keys(namesAndKeys)) {
    const nameAndKey = namesAndKeys[oisModelName];
    const representations = representationsMap[variant][oisModelName];
    const sqlModel = sqlModels[oisModelName];
    const apiModel = oisApiModels[oisModelName];
    const queryParameters = Object.assign({}, {
      crs: commonParameters.crs,
      struktur: commonParameters.struktur,
      format: commonParameters.format,
      paging: commonParameters.paging
    }, {
      propertyFilter: parametersMap[variant][oisModelName].propertyFilter,
      medtagOphørte: parametersMap[variant][oisModelName].medtagOphørte
    });
    if(apiModel.geojson) {
      queryParameters.geomWithin =commonParameters.geomWithin;
      queryParameters.reverseGeocoding = commonParameters.reverseGeocodingOptional;
    }
    const queryResource = {
      path: `${oisPaths[variant]}/${nameAndKey.plural}`,
      pathParameters: [],
      queryParameters: resourcesUtil.flattenParameters(queryParameters),
      representations: representations,
      sqlModel: sqlModel,
      singleResult: false,
      chooseRepresentation: resourcesUtil.chooseRepresentationForQuery,
      processParameters: resourcesUtil.applyDefaultPagingForQuery,
      cacheStrategy: noCacheStrategy
    };

    registry.add(`ois_${oisModelName}_${variant}`, 'resource', 'query', queryResource);
    const idParams = parametersMap[variant][oisModelName].id;
    if(idParams.length === 1) {
      const getByKeyPath = `${oisPaths[variant]}/${nameAndKey.plural}/:id`;
      const getByKeyResource = {
        path: getByKeyPath,
        pathParameters: idParams,
        queryParameters: resourcesUtil.flattenParameters(
          Object.assign({},
            {format: commonParameters.format},
            {
              crs: commonParameters.crs,
              struktur: commonParameters.struktur,
              medtagOphørte: parametersMap[variant][oisModelName].medtagOphørte
            })),
        representations: representations,
        sqlModel: sqlModel,
        singleResult: true,
        processParameters: () => null,
        chooseRepresentation: resourcesUtil.chooseRepresentationForQuery,
        cacheStrategy: noCacheStrategy
      };

      registry.add(`ois_${oisModelName}_${variant}`, 'resource', 'getByKey', getByKeyResource);
    }
  }
}
