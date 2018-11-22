"use strict";

var expect = require('chai').expect;

var checkdns = require('../../checkdns');

describe('checkdns', function() {
  it('Should be able to lookup up DNS records', function() {
    return checkdns('dawa.aws.dk').then(function(result) {
      expect(result.resolve.length).to.be.above(1);
      expect(result.lookup).to.be.a.string;
      expect(result.lookupStale).to.be.false;
    });
  });
});