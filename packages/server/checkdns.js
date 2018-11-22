"use strict";

var dns = require('dns');
var q = require('q');
var _ = require('underscore');

module.exports = function(hostname) {
  var options;
  if(process.version.substring(0, 5) === 'v0.10') {
    options = 4;
  }
  else {
    options = {
      family: 4
    };
  }
  return q.nfcall(dns.lookup, hostname, options).then(function(lookupResult) {
    var lookupAddress = lookupResult[0];
    return q.nfcall(dns.resolve4, hostname).then(function(resolveAddresses) {
      return {
        lookup: lookupAddress,
        resolve: resolveAddresses,
        lookupStale: !_.contains(resolveAddresses, lookupAddress)
      };
    });
  });
};