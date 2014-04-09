"use strict";

var _ = require('underscore');

var datamodels = require('./datamodel');

module.exports = _.reduce(datamodels, function(memo, datamodel, datamodelName) {
  var historyModel = JSON.parse(JSON.stringify(datamodel));
  historyModel.table = datamodel.table + '_history';
  historyModel.columns.unshift('valid_to');
  historyModel.columns.unshift('valid_from');
  historyModel.key = [];
  memo[datamodelName] = historyModel;
  return memo;
}, {});