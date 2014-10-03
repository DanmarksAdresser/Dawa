"use strict";

var querySenesteSekvensnummer = require('./querySenesteSekvensnummer');
var _ = require('underscore');
var commonParameters = require('../../common/commonParameters');

var representation = {
  fields: ['sekvensnummer', 'tidspunkt'],
  mapper: function() {
    return _.identity;
  }
};

var sqlModel = {
  query: function(client, fieldNames, params, callback) {
    querySenesteSekvensnummer(client, function(err, result) {
      if(err) {
        return callback(err);
      }
      callback(null, [result]);
    });
  }
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
  processParameters:  _.identity
};

module.exports = resource;
var registry = require('../../registry');

registry.add('senestesekvensnummer', 'resource',null, module.exports);