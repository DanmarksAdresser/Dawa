const { go } = require('ts-csp');
const request = require('request-promise');
const url = require('@dawadk/common/src/config/holder').getConfig().get('test.dawa_base_url');
const {waitUntil } = require('@dawadk/common/src/csp-util');
before(() => go(function*() {
  yield waitUntil(() => go(function*() {
    try {
      yield request.get(url);
      return true;
    } catch (e) {
      return false;
    }
  }), 10000);
}));
