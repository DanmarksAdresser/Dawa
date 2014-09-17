"use strict";

var registry = require('./registry');
var _ = require('underscore');
require('./allNamesAndKeys');

var map = _.indexBy(registry.where({
  type: 'nameAndKey'
}),'singular');


// Compute the base URL given a request
// This functionality is tied to the CloudFront setup.
// CloudFront does not correctly support the HOST header field, so we get the hostname of the load-balancer fronting
// the NodeJS instances. By default, these are prefixed with "origin-". We remove the "origin-" prefix to get the real
// hostname.
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


// Returns the URL to an object based on the name of the entity and the key(s). For example, a
// vejstykke with kommunekode 101 and vejkode 202 would result in URL /vejstykker/101/202
exports.getByKey = function(baseUrl, entityName, keyArray) {
  return baseUrl +'/' + encodeURIComponent(map[entityName].plural) + '/' + _.map(keyArray, encodeURIComponent).join('/');
};