"use strict";

var dns = require('dns');
var q = require('q');
var _ = require('underscore');

module.exports = function(hostname) {
  return q.nfcall(dns.lookup, hostname, { family: "4"}).then(function(lookupResult) {
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