"use strict";

var registry = require('./registry');
var _ = require('underscore');
require('./allNamesAndKeys');

var map = _.indexBy(registry.where({
  type: 'nameAndKey'
}),'singular');

exports.baseUrl = function (req) {
  // protocol in paths is always returned as http, even when on https
  var protocol = 'http';
  var host = req.headers.host;
  if(!_.isString(host)) {
    host = 'dawa';
  }
  // this is a workaround for CloudFront, which does not forward the host header properly.
  // Instead, we set origin-<hostname> as alias for the origin server, and then strip it
  if(host.indexOf('origin-') === 0) {
    host = host.substring('origin-'.length);
  }
  return protocol + '://' + host;
};



exports.getByKey = function(baseUrl, entityName, keyArray) {
  return baseUrl +'/' + encodeURIComponent(map[entityName].plural) + '/' + _.map(keyArray, encodeURIComponent).join('/');
};