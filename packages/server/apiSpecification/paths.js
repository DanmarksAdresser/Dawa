"use strict";

const logger = require('@dawadk/common/src/logger').forCategory('paths');
var registry = require('./registry');
var _ = require('underscore');
require('./allNamesAndKeys');
const configHolder = require('@dawadk/common/src/config/holder');

const getProtocol = req => {
  if(req.headers['cloudfront-forwarded-proto']) {
    const cfProto = req.headers['cloudfront-forwarded-proto'] || req.headers['x-forwarded-proto'];
    if(cfProto === 'http' || cfProto === 'https') {
      return cfProto;
    }
    else {
      logger.error('Invalid value of cloudFront-forwarded-proto header', {value:cfProto });
      return 'http';
    }
  }
  else {
    return 'http';
  }
};
exports.getProtocol = getProtocol;

const getHostname = req => {
  if(req.headers['x-forwarded-host']) {
    return req.headers['x-forwarded-host'];
  }
  const hostFromConfig = configHolder.getConfig().get('hostname');
  if(hostFromConfig) {
    return hostFromConfig;
  }
  let host = req.headers.host;
  if(!_.isString(host)) {
    host = 'dawa';
  }
  // this is a workaround for CloudFront, which does not forward the host header properly.
  // Instead, we set origin-<hostname> as alias for the origin server, and then strip it
  if(host.indexOf('origin-') === 0) {
    host = host.substring('origin-'.length);
  }
  return host;
};

var map = registry.entriesWhere({
  type: 'nameAndKey'
}).reduce((memo, entry) => {
  memo[entry.entityName] = entry.object;
  return memo;
}, {});

// Compute the base URL given a request
// This functionality is tied to the CloudFront setup.
// CloudFront does not correctly support the HOST header field, so we get the hostname of the load-balancer fronting
// the NodeJS instances. By default, these are prefixed with "origin-". We remove the "origin-" prefix to get the real
// hostname.
exports.baseUrl = function (req) {
  const protocol = getProtocol(req);
  const host = getHostname(req);
  return protocol + '://' + host;
};


// Returns the URL to an object based on the name of the entity and the key(s). For example, a
// vejstykke with kommunekode 101 and vejkode 202 would result in URL /vejstykker/101/202
exports.getByKey = function(baseUrl, entityName, keyArray) {
  return baseUrl +'/' + encodeURIComponent(map[entityName].path || map[entityName].plural) + '/' + _.map(keyArray, encodeURIComponent).join('/');
};
