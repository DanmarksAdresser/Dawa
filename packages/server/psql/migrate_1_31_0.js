"use strict";
const fs = require('fs');
const path = require('path');
const {go} = require('ts-csp');
const runConfigured = require('@dawadk/common/src/cli/run-configured');
const proddb = require('./proddb');
const configHolder = require('@dawadk/common/src/config/holder');
const {tableSql} = require('../ois2/sql-gen');
const {reloadDatabaseCode, } = require('./initialization');
const {importWithoutEvents, withImportTransaction} = require('../importUtil/transaction-util');
const grbbrTableModels = require('../ois2/table-models');
const createOisImporter = require('../components/importers/ois');
const { execute } = require('../components/execute');
const { EXECUTION_STRATEGY} = require('../components/common');
const { createChangeTable } = require('@dawadk/import-util/src/table-diff');
const oisModels = require('../ois/oisModels');
const schema = configHolder.mergeConfigSchemas([
  {
    database_url: {
      doc: "URL for databaseforbindelse",
      format: 'string',
      default: null,
      cli: true,
      required: true
    },
    ois_dir: {
      doc: "Placering af OIS filer",
      format: 'string',
      default: null,
      cli: true,
      required: true
    }
  },
  require('@dawadk/import-util/conf/schemas/s3-offload-schema')
]);

runConfigured(schema, [], config => go(function* () {
  proddb.init({
    connString: config.get('database_url'),
    pooled: false
  });

  yield proddb.withTransaction('READ_WRITE', client => go(function* () {
    yield client.query(fs.readFileSync(path.join(__dirname, 'schema/tables/grbbr_virkning_ts.sql'), {encoding: 'utf-8'}));
    yield client.query(tableSql);
    for(let tableModel of grbbrTableModels.allTableModels) {
      yield createChangeTable(client, tableModel);
    }
    yield client.query('ALTER TABLE jordstykker ADD COLUMN bfenummer BIGINT');
    yield client.query('ALTER TABLE jordstykker_changes ADD COLUMN bfenummer BIGINT');
    yield client.query('ALTER TABLE jordstykker ADD COLUMN grund_id uuid');
    yield client.query('ALTER TABLE jordstykker_changes ADD COLUMN grund_id uuid');
    yield client.query('ALTER TABLE jordstykker ADD COLUMN ejendomsrelation_id uuid');
    yield client.query('ALTER TABLE jordstykker_changes ADD COLUMN ejendomsrelation_id uuid');
    yield client.query(`
    CREATE INDEX ON jordstykker (bfenummer);
    CREATE INDEX ON jordstykker(grund_id);
    CREATE INDEX ON jordstykker(ejendomsrelation_id);
    CREATE INDEX ON jordstykker(featureid);
`);

    yield client.query('ALTER TABLE ois_importlog RENAME entity TO oistable');
    for(let entityName of Object.keys(oisModels)) {
      const oisTable = oisModels[entityName].oisTable;
      yield client.query('update ois_importlog set oistable = $1 where oistable = $2', [oisTable.toLowerCase(), entityName]);
    }

    yield reloadDatabaseCode(client, path.join(__dirname, 'schema'));
    yield withImportTransaction(client, 'migrate_1_31_0', txid => go(function*(){
    }));
    yield importWithoutEvents(client, 'migrate_1_31_0',
      [...grbbrTableModels.allTableModels.map(model => model.table), 'jordstykker'],
      txid => go(function* () {
        const importer = createOisImporter({dataDir: config.get('ois_dir')});
        return yield execute(client, txid, [importer],  EXECUTION_STRATEGY.verify);
      }));
  }));
}));
