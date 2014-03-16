"use strict";

var registry = require('./registry');
var _ = require('underscore');
require('./allNamesAndKeys');

var map = _.indexBy(registry.where({
  type: 'nameAndKey'
}),'singular');

exports.getByKey = function(baseUrl, entityName, keyArray) {
  return baseUrl +'/' + map[entityName].plural + '/' + keyArray.join('/');
};