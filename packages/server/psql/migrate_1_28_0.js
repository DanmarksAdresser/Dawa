"use strict";

const { assert } = require('chai');
const {go} = require('ts-csp');
const fs = require('fs');
const runConfigured = require('@dawadk/common/src/cli/run-configured');
const proddb = require('./proddb');
const temaModels = require('../dagiImport/temaModels').modelList;
const configHolder = require('@dawadk/common/src/config/holder');
const { createS3 } = require('@dawadk/import-util/src/s3-util');
const {uploadToS3} = require('@dawadk/import-util/src/s3-offload');
const {initChangeTable, createChangeTable} = require('@dawadk/import-util/src/table-diff');
const { name } = require('@dawadk/import-util/src/table-diff-protocol');
const { withImportTransaction } = require('../importUtil/transaction-util');
const tableSchema = require('./tableModel');
const { generateHistory } = require('../history/generateCombinedHistoryImpl');


const schema = configHolder.mergeConfigSchemas([
  {
    database_url: {
      doc: "URL for databaseforbindelse",
      format: 'string',
      default: null,
      cli: true,
      required: true
    }
  },
  require('@dawadk/import-util/src/config/schemas/s3-offload-import-schema')
]);

const migrateS3Offloaded = (client, txid, tableModel) => go(function*() {
  const config = configHolder.getConfig();
  const s3 = createS3();
  const bucket = config.get('s3_offload.bucket');
  const threshold = config.get('s3_offload.threshold');
  const path = config.get('s3_offload.path');
  const keyPrefix = config.get('s3_offload.key_prefix');
  const table = tableModel.table;
  const geomColumn = tableModel.columns.find(col => name(col) === 'geom');
  assert(geomColumn);
  // generate blobrefs, which identifies the objects in S3.
  yield client.query(
    `UPDATE ${table} SET geom_blobref = $2 || uuid_generate_v4()
     WHERE char_length(st_asgeojson(geom)::text) > $1
     `, [threshold, keyPrefix]);

  // update blobref table, so we can look up a blobref
  yield client.query(`INSERT INTO blobref(blobid, txid, entity, columnName) 
(SELECT geom_blobref, $1, $2, $3 
FROM ${table} where geom_blobref is not null)`,
    [txid, tableModel.entity, 'geom']);

  // get the geometries from the db so we can upload them to S3. For now, we keep simple and do not
  // do this in a streaming fashion, as stuff fits acceptably into memory.
  const geometries = yield client.queryRows(`
   SELECT geom_blobref as blob_id, st_asgeojson(geom) as geom_json
   FROM ${table} where  geom_blobref is not null`);

  // upload the geometries
  for(let {blob_id, geom_json} of geometries) {
    yield uploadToS3(s3, bucket, path, blob_id, geom_json);
  }

  // Deleting local copies of the geometry is not done until AFTER applying changes to main table,
  // so that the geometry is copied correctly to main table.
  yield initChangeTable(client, txid, tableModel);
});

runConfigured(schema, [],config => go(function*() {
  proddb.init({
    connString: config.get('database_url'),
    pooled: false
  });

  yield proddb.withTransaction('READ_WRITE', client => go(function*() {
    yield client.query(fs.readFileSync(require.resolve('./schema/tables/blobref.sql'), {encoding: 'utf8'}));
    yield client.query(fs.readFileSync(require.resolve('./schema/tables/vask_adgangsadresser.sql'), {encoding: 'utf8'}));
    yield client.query(fs.readFileSync(require.resolve('./schema/tables/vask_adresser.sql'), {encoding: 'utf8'}));
    yield createChangeTable(client, tableSchema.tables.vask_adgangsadresser);
    yield createChangeTable(client, tableSchema.tables.vask_adresser);
    yield client.query('alter table stedtilknytninger_changes alter public drop not null');
    yield withImportTransaction(client, 'migrate_1_28_0', (txid) => go(function*() {
      yield generateHistory(client, txid, '2018-05-05T00:00:00.000Z');
    }));
    const offloadedTables = ['vejmidter', 'ejerlav', 'steder', ...temaModels.map(tema => tema.table)];
    for(let table of offloadedTables) {
      yield client.query(`
    ALTER TABLE ${table} ADD COLUMN geom_blobref text;
ALTER TABLE ${table}_changes ADD COLUMN geom_blobref text;
DELETE FROM ${table}_changes
`);

    }
    yield client.query(`
ALTER TABLE hoejde_importer_afventer DROP COLUMN disableuntil;
create table hoejde_importer_disabled(
                                       husnummerid uuid primary key,
  -- disable height lookup until this timestamp
                                       disableuntil timestamptz
);
ALTER TABLE ikke_brofaste_adresser DROP CONSTRAINT ikke_brofaste_adresser_pkey,
                         ADD PRIMARY KEY(adgangsadresseid);`);
    yield withImportTransaction(client, 'migrate_1_28_0', (txid) => go(function*() {
      for(let table of offloadedTables) {
        const tableModel = tableSchema.tables[table];
        yield migrateS3Offloaded(client, txid, tableModel);
      }
    }));
  }));
}));
