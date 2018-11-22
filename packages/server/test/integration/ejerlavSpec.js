"use strict";

const {assert} = require('chai');
const {go} = require('ts-csp');

const helpers = require('./helpers');
const resources = require('../../apiSpecification/ejerlav/resources');
const testdb = require('@dawadk/test-util/src/testdb');

describe('Ejerlav', () => {
  const queryResource = resources.query;
  testdb.withTransactionEach('test', (clientFn) => {
      it('Ejerlav reverse geocoding', () => go(function* () {
        const result = yield helpers.getJson(clientFn(), queryResource, {}, {
          srid: '25832',
          x: '685477.186430184',
          y: '6159305.17270726'
        });
        assert.strictEqual(result.length, 1);
        assert.strictEqual(result[0].kode, 60851);
        const emptyResult = yield helpers.getJson(clientFn(), queryResource, {}, {
          srid: '25832',
          x: '585477.186430184',
          y: '6159305.17270726'
        });
        assert.strictEqual(emptyResult.length, 0);
      }));
  });
});

