"use strict";

const { go } = require('ts-csp');
const resourceImpl = require('../../common/resourceImpl');
const resources = require('./resources');
const registry = require('../../registry');
const replikeringModels = require('../datamodel');
const commonReplikeringParameters = require('../commonParameters');

const parameters = commonReplikeringParameters.entitet;

const combinedEventHandler = (client, baseUrl, pathParams, queryParams) => go(function*() {
  const [errResponse, validatedParams] = resourceImpl.parseQueryParams(parameters, queryParams);
  if(errResponse) {
    return errResponse;
  }
  let entityName = validatedParams.entitet;
  // workaround spelling error maintainging backwards compatibility
  if(entityName === 'aftemningsområdetilknytning') {
    entityName = 'afstemningsområdetilknytning';
  }
  const resource = resources[entityName];
  const delegateHandler = resourceImpl.resourceResponseHandler(resource);
  return yield this.delegateAbort(delegateHandler(client, baseUrl, pathParams, queryParams));
});

module.exports = {
  path: '/replikering/haendelser',
  responseHandler: combinedEventHandler,
  queryParameters: [...commonReplikeringParameters.entitet]
};

registry.add('replikering', 'httpHandler', 'hændelser', module.exports);

