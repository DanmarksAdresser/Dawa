const { assert } = require('chai');

const Promise = require('bluebird');
const zlib = require('zlib');

const {go} = require('ts-csp');

const configHolder = require('@dawadk/common/src/config/holder');
const {columnsEqualClause, selectList} = require('@dawadk/common/src/postgres/sql-util');
const { distinctClause, name } = require('./table-diff-protocol');
const { createS3 } = require('./s3-util');
const logger = require('@dawadk/common/src/logger').forCategory('s3Offload');

const uploadToS3 = (s3, bucket, path, key, jsonText) => go(function*() {
  const s3Key = (path ? (path + '/') : '') + key;
  logger.info('Uploading to s3', {
    s3Key,
    bucket,
    length: jsonText.length
  });
  const zipped = yield Promise.promisify(zlib.gzip, {context: zlib})(jsonText);
  return yield Promise.promisify(s3.upload, {context: s3})({
    Bucket: bucket,
    Key: s3Key,
    Body: zipped,
    ContentEncoding: 'gzip',
    ContentType: 'application/json; charset=utf-8'
  });
});

const offloadGeometryColumnToS3Internal = (client, txid,
                                   table, entityName, columnName, blobRefColumnName,
                                   s3, bucket, threshold,
                                   path,
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
    yield uploadToS3(s3, bucket, path, blob_id, geom_json);
  }
  // remove the large geometries from database
  yield client.query(`update ${table}_changes set ${columnName} = null where ${blobRefColumnName} is not null and txid = $1`, [txid]);
});

/*
 * Upload large geometries to S3. This is done *before* applying changes to main table, such that the references to S3
 * can be properly copied to main table.
 */
const offloadGeometryColumnToS3 = (client, txid, tableModel, geomColumnName, blobrefColumnName) => go(function*() {
  const config = configHolder.getConfig();
  const s3 = createS3();
  const bucket = config.get('s3_offload.bucket');
  const threshold = config.get('s3_offload.threshold');
  const path = config.get('s3_offload.path');
  const keyPrefix = config.get('s3_offload.key_prefix');
  const table = tableModel.table;
  const geomColumn = tableModel.columns.find(col => name(col) === geomColumnName);
  assert(geomColumn);
  // generate blobrefs, which identifies the objects in S3. conditions:
  // current transaction
  // not equal to current
  // size above threshold
  yield client.query(
    `WITH rowsToUpload AS ( 
    SELECT ${selectList('chan', tableModel.primaryKey)}
     FROM ${table}_changes chan 
     LEFT JOIN ${table} prim ON (${columnsEqualClause('chan', 'prim', tableModel.primaryKey)})
     WHERE txid = $1 
     AND ((operation = 'insert')
          OR ${distinctClause(geomColumn, `prim.${geomColumnName}`, `chan.${geomColumnName}`)})
     AND char_length(st_asgeojson(chan.${geomColumnName})::text) > $2)
     UPDATE ${table}_changes chan
     SET ${blobrefColumnName} = $3 || uuid_generate_v4()
     FROM rowsToUpload
     WHERE txid = $1
     AND ${columnsEqualClause('chan', 'rowsToUpload', tableModel.primaryKey)}`, [txid, threshold, keyPrefix]);

  // update blobref table, so we look up a blobref
  yield client.query(`INSERT INTO blobref(blobid, txid, entity, columnName) 
(SELECT ${blobrefColumnName}, $1, $2, $3 
FROM ${table}_changes where txid = $1 
                                 and ${blobrefColumnName} is not null)`,
    [txid, tableModel.entity, geomColumnName]);

  // get the geometries from the db so we can upload them to S3. For now, we keep simple and do not
  // do this in a streaming fashion, as stuff fits acceptably into memory.
  const geometries = yield client.queryRows(`
   SELECT ${blobrefColumnName} as blob_id, st_asgeojson(${geomColumnName}) as geom_json
   FROM ${table}_changes where txid = $1 and ${blobrefColumnName} is not null`, [txid]);

  // upload the geometries
  for(let {blob_id, geom_json} of geometries) {
    yield uploadToS3(s3, bucket, path, blob_id, geom_json);
  }

  // Unchanged geometries use the old s3 ref
  yield client.query(`UPDATE ${table}_changes chan SET ${blobrefColumnName} = prim.${blobrefColumnName}
  FROM ${table} prim
  WHERE txid = $1 
  AND NOT (${distinctClause(geomColumn, `chan.${geomColumnName}`, `prim.${geomColumnName}`)})
  AND ${columnsEqualClause('chan', 'prim', tableModel.primaryKey)}`, [txid])

  // Deleting local copies of the geometry is not done until AFTER applying changes to main table,
  // so that the geometry is copied correctly to main table.
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
const offloadToS3Internal = (client, txid, tableModel, s3, bucket, threshold, path, keyPrefix) => go(function* () {
  for(let column of tableModel.columns) {
    if(column.offloads) {
      const columnName = column.offloads;
      const blobRefColumnName = column.name;
      assert(tableModel.entity);
      yield offloadGeometryColumnToS3Internal(client, txid, tableModel.table, tableModel.entity, columnName, blobRefColumnName, s3, bucket, threshold, path,keyPrefix);
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
      config.get('s3_offload.path'),
      config.get('s3_offload.key_prefix'));
  }
});

module.exports = {
  uploadToS3,
  offloadToS3,
  offloadGeometryColumnToS3
};