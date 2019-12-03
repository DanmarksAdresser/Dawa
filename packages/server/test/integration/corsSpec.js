const { go } = require('ts-csp');
const {assert } = require('chai');
const request = require("request-promise");
const config = require('@dawadk/common/src/config/holder').getConfig();
const baseUrl = config.get('test.dawa_base_url');

describe('API should support CORS', () => {
   it('GET responses permits any origin', () => go(function*() {
       const response = yield request.get({
           url: `${baseUrl}/adresser?per_side=10`,
           resolveWithFullResponse: true
       });
       assert.strictEqual(response.headers['access-control-allow-origin'], '*');
   }));
   it('Supports CORS preflight requests', () => go(function*() {
       const response = yield request.options({
           url: `${baseUrl}/adresser?per_side=10`,
           headers: {
               'Access-Control-Request-Method': 'GET',
               'Access-Control-Request-Headers': 'myCustomHeader'
           },
           resolveWithFullResponse: true
       });
       assert.strictEqual(response.headers['access-control-allow-origin'], '*');
       assert.strictEqual(response.headers['access-control-allow-methods'], 'GET,HEAD,PUT,PATCH,POST,DELETE');
   }));
});