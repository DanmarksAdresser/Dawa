"use strict";

const {go} = require('ts-csp');
const resourceImpl = require('../../common/resourceImpl');
const resources = require('./resources');
const registry = require('../../registry');
const replikeringModels = require('../datamodel');

const parameters = [{
  name: 'entitet',
  type: 'string',
  schema: {
    enum: Object.keys(replikeringModels)
  },
  required: true

}];

const combinedUdtraekHandler = (client, baseUrl, pathParams, queryParams) => go(function* () {
  const [errResponse, validatedParams] = resourceImpl.parseQueryParams(parameters, queryParams);
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
  responseHandler: combinedUdtraekHandler
};

registry.add('replikering', 'httpHandler', 'udtræk', module.exports);

