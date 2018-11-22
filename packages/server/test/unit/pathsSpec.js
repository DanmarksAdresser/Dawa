"use strict";

const expect = require('chai').expect;

const paths = require('../../apiSpecification/paths');

describe('baseUrl', () => {
  it('If protocol is forwarded by CloudFront, we use it', () => {
    const req = {
      protocol: 'http',
      headers: {
        'cloudfront-forwarded-proto': 'https',
        host: 'a-host'
      }
    }
    const baseUrl = paths.baseUrl(req);
    expect(baseUrl).to.equal('https://a-host');
  });
});
