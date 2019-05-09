"use strict";
const { assert } = require('chai');
const {go} = require('ts-csp');
const request = require('request-promise');
const {
  uploadToS3
} = require('../src/s3-offload');

const { createS3 } = require('../src/s3-util');
const testdb = require('@dawadk/test-util/src/testdb');
const { withImportTransaction } = require('../src/transaction');
const configHolder = require('@dawadk/common/src/config/holder');
const tableDiff = require('../src/table-diff');
const {offloadedGeomColumn, offloadedGeomBlobrefColumn} = require('../src/common-columns');

const stederTableModel = {
  table: 'steder',
  entity: 'sted',
  primaryKey: ['id'],
  columns: [
    {name: 'id'},
    {name: 'ændret'},
    {name: 'geo_version'},
    {name: 'geo_ændret'},
    {name: 'hovedtype'},
    {name: 'undertype'},
    offloadedGeomColumn({}),
    offloadedGeomBlobrefColumn({})
  ]
};

const getFromS3 = key => go(function*() {
  const config = configHolder.getConfig();
  const result = yield request.get({url: `${config.get('s3_offload.s3.endpoint')}/${config.get('test.s3rver.bucket')}/${key}`, gzip: true, json: true, resolveWithFullResponse: true});
  assert.strictEqual(result.headers['content-encoding'], 'gzip');
  assert.strictEqual(result.headers['content-type'], 'application/json; charset=utf-8');
  return result.body;
});

describe('S3 offload', () => {
  it('Can upload to S3', () => go(function* () {
    const s3 = createS3();
    const bucket = configHolder.getConfig().get('s3_offload.bucket');
    yield uploadToS3(s3, bucket,'test-path', 'test-key', `{"foo": "bar"}`);
    const result = yield getFromS3('test-path/test-key');
    assert.deepStrictEqual(result, {foo: 'bar'});
  }));


  testdb.withTransactionEach('empty', (clientFn) => {
    it('Can offload to S3', () => go(function*() {
      const sted = {
        id: '8160609e-87e0-424e-9d14-422f435f0112',
        ændret: '2019-01-01T00:00:00Z',
        geo_ændret: '2019-01-01T00:00:00Z',
        geo_version: 1,
        hovedtype: 'Bebyggelse',
        undertype: 'By',
        geom: 'SRID=25832;POINT(578947.37 6149329.8)'
      };
      yield withImportTransaction(clientFn(), 'test', [stederTableModel], txid => go(function*() {
        yield configHolder.withConfigOverride({'s3_offload.threshold': 1}, () => go(function*() {
          yield tableDiff.createIncrementalDifferences(clientFn(), txid, stederTableModel, [sted], []);

          yield tableDiff.applyChanges(clientFn(), txid, stederTableModel);
          const result = yield clientFn().queryRows('select * from steder_changes');
          assert.strictEqual(result.length, 1);
          assert.isNull(result[0].geom);
          const blobRef = result[0].geom_blobref;
          const blobJson = yield getFromS3(`${configHolder.getConfig().get('s3_offload.path')}/${blobRef}`);
          assert.deepStrictEqual(blobJson, {
            "coordinates": [
              578947.37,
              6149329.8
            ],
            "type": "Point"
          });
        }));
      }));
    }));
  });
});