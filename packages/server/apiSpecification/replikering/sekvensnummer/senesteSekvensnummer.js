"use strict";

const { go } = require('ts-csp');

var querySenesteSekvensnummer = require('./querySenesteSekvensnummer');
var _ = require('underscore');
var commonParameters = require('../../common/commonParameters');
const {noCacheStrategy} = require('../../common/caching');

var representation = {
  fields: ['sekvensnummer', 'tidspunkt'],
  mapper: function() {
    return _.identity;
  }
};

var sqlModel = {
  processQuery: (client, fieldNames, params) => go(function*() {
    const result = yield querySenesteSekvensnummer(client);
    return [result];
  })
};

var resource = {
  path: '/replikering/senesteSekvensnummer',
  pathParameters: [],
  queryParameters: commonParameters.format,
  representations: {flat: representation},
  sqlModel: sqlModel,
  singleResult: true,
  chooseRepresentation: function(formatParam) {
    if(!formatParam || formatParam === 'json' || formatParam === 'csv') {
      return representation;
    }
    else {
      return null;
    }
  },
  processParameters:  _.identity,
  cacheStrategy: noCacheStrategy
};

module.exports = resource;
var registry = require('../../registry');

registry.add('senestesekvensnummer', 'resource',null, module.exports);
