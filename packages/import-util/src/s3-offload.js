const { assert } = require('chai');

const Promise = require('bluebird');
const zlib = require('zlib');

const {go} = require('ts-csp');

const configHolder = require('@dawadk/common/src/config/holder');

const { createS3 } = require('./s3-util');

const uploadToS3 = (s3, bucket, key, jsonText) => go(function*() {
  const zipped = yield Promise.promisify(zlib.gzip, {context: zlib})(jsonText);
  return yield Promise.promisify(s3.upload, {context: s3})({
    Bucket: bucket,
    Key: key,
    Body: zipped,
    ContentEncoding: 'gzip',
    ContentType: 'application/json; charset=utf-8'
  });
});

const offloadGeometryColumnToS3 = (client, txid,
                                   table, entityName, columnName, blobRefColumnName,
                                   s3, bucket, threshold,
                                   keyPrefix) => go(function*() {
  // generate references for all large geometries (size greater than threshold)
  yield client.query(`UPDATE ${table}_changes 
  SET ${blobRefColumnName} = $3 || uuid_generate_v4()
  WHERE txid = $1 AND char_length(st_asgeojson(${columnName})::text) > $2`, [txid, threshold, keyPrefix]);
  // update blobref table, so we look up a blobref
  yield client.query(`INSERT INTO blobref(blobid, txid, entity, columnName) (SELECT ${blobRefColumnName}, $1, $2, $3 FROM ${table}_changes where txid = $1 and ${blobRefColumnName} is not null)`, [txid, entityName, columnName]);
  const geometries = yield client.queryRows(`
   SELECT ${blobRefColumnName} as blob_id, st_asgeojson(${columnName}) as geom_json
   FROM ${table}_changes where txid = $1 and ${blobRefColumnName} is not null`, [txid]);
  for(let {blob_id, geom_json} of geometries) {
    yield uploadToS3(s3, bucket, blob_id, geom_json);
  }
  // remove the large geometries from database
  yield client.query(`update ${table}_changes set ${columnName} = null where ${blobRefColumnName} is not null and txid = $1`, [txid]);
});

const hasOffloadedColumn = tableModel => {
  for(let column of tableModel.columns) {
    if(column.offloads) {
      return true;
    }
  }
  return false;
};
/**
 * Uploads any offloaded columns to s3. Must be called *after* changes has been applied to primary table.
 */
const offloadToS3Internal = (client, txid, tableModel, s3, bucket, threshold, keyPrefix) => go(function* () {
  for(let column of tableModel.columns) {
    if(column.offloads) {
      const columnName = column.offloads;
      const blobRefColumnName = column.name;
      assert(tableModel.entity);
      yield offloadGeometryColumnToS3(client, txid, tableModel.table, tableModel.entity, columnName, blobRefColumnName, s3, bucket, threshold, keyPrefix);
    }
  }
});

const offloadToS3 = (client, txid, tableModel) => go(function*() {
  if(hasOffloadedColumn(tableModel)) {
    const config = configHolder.getConfig();
    const s3 = createS3();
    yield offloadToS3Internal(client, txid, tableModel, s3,
      config.get('s3_offload.bucket'),
      config.get('s3_offload.threshold'),
      config.get('s3_offload.path'));
  }
});

module.exports = {
  uploadToS3,
  offloadToS3
};