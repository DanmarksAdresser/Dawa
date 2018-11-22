"use strict";

const { go } = require('ts-csp');

const commonParameters = require('../commonParameters');
const resourceImpl = require('../../common/resourceImpl');
const registry = require('../../registry');
const inspect = require('../../../importUtil/inspectImpl');

const parameters = [Object.assign({}, commonParameters.txid[0], {required: true}), {name: 'aggregate', type: 'boolean'}];

const combinedEventHandler = (client, baseUrl, pathParams, queryParams) => go(function* () {
  const [errResponse, validatedParams] = resourceImpl.parseQueryParams(parameters, queryParams);
  if (errResponse) {
    return errResponse;
  }
  const txid = validatedParams.txid;
  const result = yield inspect(client, txid, null, null, validatedParams.aggregate);
  return {
    status: 200,
    headers: {
      'Content-Type': 'application/json; charset=UTF-8'
    },
    body: JSON.stringify(result, undefined, 2)
  }
});

module.exports = {
  path: '/replikering/transaktioner/inspect',
  responseHandler: combinedEventHandler,
  queryParameters: parameters
};

registry.add('transaktioner', 'httpHandler', 'inspectTransaction', module.exports);

