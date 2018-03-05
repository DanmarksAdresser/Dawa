"use strict";

const {go} = require('ts-csp');
const resourceImpl = require('../../common/resourceImpl');
const resources = require('./resources');
const registry = require('../../registry');
const commonReplikeringParameters = require('../commonParameters');

const combinedUdtraekHandler = (client, baseUrl, pathParams, queryParams) => go(function* () {
  const [errResponse, validatedParams] = resourceImpl.parseQueryParams(commonReplikeringParameters.entitet, queryParams);
  if (errResponse) {
    return errResponse;
  }
  const entityName = validatedParams.entitet;
  const resource = resources[entityName];
  const delegateHandler = resourceImpl.resourceResponseHandler(resource);
  return yield this.delegateAbort(delegateHandler(client, baseUrl, pathParams, queryParams));
});

module.exports = {
  path: '/replikering/udtraek',
  responseHandler: combinedUdtraekHandler,
  queryParameters: [...commonReplikeringParameters.entitet, ...commonReplikeringParameters.sekvensnummer]
};

registry.add('replikering', 'httpHandler', 'udtræk', module.exports);

