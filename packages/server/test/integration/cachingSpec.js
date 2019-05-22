"use strict";

const {go} = require('ts-csp');
const {assert} = require('chai');
const request = require("request-promise");
const config = require('@dawadk/common/src/config/holder').getConfig();
const baseUrl = config.get('test.dawa_base_url');

describe("Caching", function () {
  it("2xx svar skal caches", () => go(function* () {
    const response = yield request.get({
      url: `${baseUrl}/adresser?per_side=1`,
      json: true,
      resolveWithFullResponse: true
    });
    assert.match(response.headers['cache-control'], /max-age=[\d]+/g);
  }));
  it('Not found skal ikke caches', () => go(function* () {
    const response = yield request.get({
      url: `${baseUrl}/adresser/000021c5-e9ee-411d-b2d8-ec9161780ccf`,
      json: true,
      simple: false,
      resolveWithFullResponse: true
    });
    assert.strictEqual(response.statusCode, 404);
    assert.strictEqual(response.headers['cache-control'], 'no-cache');
  }));

  it('Datavask-svar har 2 dages cachetid', () => go(function*() {
    const response = yield request.get({
      url: `${baseUrl}/datavask/adresser?betegnelse=Margrethepladsen 4, 4. 8000 Aarhus C`,
      json: true,
      resolveWithFullResponse: true
    });
    assert.strictEqual(response.headers['cache-control'], `max-age=${2 * 24 * 60 * 60}`);
  }));

  it('OIS-udtræk har no-store', () => go(function*() {
    const response = yield request.get({
      url: `${baseUrl}/ois/bygninger?per_side=10`,
      json: true,
      resolveWithFullResponse: true
    });
    assert.strictEqual(response.headers['cache-control'], `no-store`);
  }));

  it('OIS enkeltopslag har no-store',() => go(function*() {
    const response = yield request.get({
      url: `${baseUrl}/ois/bygninger/b390fa5d-e9ab-4e75-96de-1ad40d65d92c`,
      json: true,
      resolveWithFullResponse: true
    });
    assert.strictEqual(response.headers['cache-control'], `no-store`);
  }));

  it('Fejlsvar skal ikke caches', () => go(function* () {
    const response = yield request.get({
      url: `${baseUrl}/adresser?cirkel=invalid`,
      json: true,
      simple: false,
      resolveWithFullResponse: true
    });
    assert.strictEqual(response.statusCode, 400);
    assert.strictEqual(response.headers['cache-control'], 'no-cache');
  }));

  it('Dokumentationssider er cachet', () => go(function*() {
    const response = yield request.get({
      url: `${baseUrl}/dok/adresser`,
      resolveWithFullResponse: true
    });
    assert.match(response.headers['cache-control'], /max-age=[\d]+/g);
  }));
  it('Forside er cachet', () => go(function*() {
    const response = yield request.get({
      url: `${baseUrl}`,
      resolveWithFullResponse: true
    });
    assert.match(response.headers['cache-control'], /max-age=[\d]+/g);
  }));
});
