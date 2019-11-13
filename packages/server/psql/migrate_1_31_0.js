"use strict";
const fs = require('fs');
const path = require('path');
const {go} = require('ts-csp');
const runConfigured = require('@dawadk/common/src/cli/run-configured');
const proddb = require('./proddb');
const configHolder = require('@dawadk/common/src/config/holder');
const {tableSql} = require('../ois2/sql-gen');
const {reloadDatabaseCode,} = require('./initialization');
const {importWithoutEvents} = require('../importUtil/transaction-util');
const grbbrTableModels = require('../ois2/table-models');
const createOisImporter = require('../components/importers/ois');
const {EXECUTION_STRATEGY} = require('../components/common');
const {createChangeTable, applyCurrentTableToChangeTable} = require('@dawadk/import-util/src/table-diff');
const oisModels = require('../ois/oisModels');
const logger = require('@dawadk/common/src/logger').forCategory('migrate');
const grbbrModels = require('../ois2/parse-ea-model');
const grbbrProcessors = require('../components/processors/grbbr');
const tableSchema = require('./tableModel');
const { withImportTransaction } = require('../importUtil/transaction-util');
const {clearAndMaterialize, recomputeMaterialization} = require('@dawadk/import-util/src/materialize');
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
    },
    etape: {
      doc: 'Hvilken etape der køres. Hvis ikke angivet kores alle etaper.',
      format: 'integerOrNull',
      default: null,
      cli: true
    }
  },
  require('@dawadk/import-util/conf/schemas/s3-offload-schema')
]);


runConfigured(schema, [], config => go(function* () {
  proddb.init({
    connString: config.get('database_url'),
    pooled: false
  });

  const etaper = [
    () => go(function* () {
      logger.info('Etape 0: Schema-migrering');
      yield proddb.withTransaction('READ_WRITE', client => go(function* () {
        yield client.query(fs.readFileSync(path.join(__dirname, 'schema/tables/grbbr_virkning_ts.sql'), {encoding: 'utf-8'}));
        yield client.query(tableSql);
        for (let tableModel of grbbrTableModels.allTableModels) {
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
            CREATE INDEX ON jordstykker (grund_id);
            CREATE INDEX ON jordstykker (ejendomsrelation_id);
            CREATE INDEX ON jordstykker (featureid);
        `);

        yield client.query('ALTER TABLE ois_importlog RENAME entity TO oistable');
        for (let entityName of Object.keys(oisModels)) {
          const oisTable = oisModels[entityName].oisTable;
          yield client.query('update ois_importlog set oistable = $1 where oistable = $2', [oisTable.toLowerCase(), entityName]);
        }
        yield client.query(fs.readFileSync(path.join(__dirname, 'schema/tables/vejnavnpostnummerrelation.sql'), {encoding: 'utf-8'}));
        yield client.query(fs.readFileSync(path.join(__dirname, 'schema/tables/navngivenvejkommunedel_mat.sql'), {encoding: 'utf-8'}));
        yield client.query(fs.readFileSync(path.join(__dirname, 'schema/tables/navngivenvejkommunedel_postnr_mat.sql'), {encoding: 'utf-8'}));
        yield createChangeTable(client, tableSchema.tables.vejnavnpostnummerrelation);
        yield createChangeTable(client, tableSchema.tables.navngivenvejkommunedel_mat);
        yield createChangeTable(client, tableSchema.tables.navngivenvejkommunedel_postnr_mat);
        yield reloadDatabaseCode(client, path.join(__dirname, 'schema'));
        yield withImportTransaction(client, 'migrate_1_32_0', (txid) => go(function*() {
          yield clearAndMaterialize(client, txid, tableSchema.tables, tableSchema.materializations.vejnavnpostnummerrelation);
          yield clearAndMaterialize(client, txid, tableSchema.tables, tableSchema.materializations.navngivenvejkommunedel_mat);
          yield clearAndMaterialize(client, txid, tableSchema.tables, tableSchema.materializations.navngivenvejkommunedel_postnr_mat);
          yield recomputeMaterialization(client, txid, tableSchema.tables, tableSchema.materializations.vejstykkerpostnumremat);
        }));
      }));
    }),
    () => go(function* () {
      logger.info('Etape 1: Bygnings-indlæsning');
      yield proddb.withTransaction('READ_WRITE', client => go(function* () {
        yield importWithoutEvents(client, 'migrate_1_31_0',
          [...grbbrTableModels.allTableModels.map(model => model.table), 'jordstykker'],
          txid => go(function* () {
            const importer = createOisImporter({
              dataDir: config.get('ois_dir'),
              entityNames: ['bygning']
            });
            yield importer.execute(client, txid);
          }));
      }));
    }),
    () => go(function* () {
      logger.info('Etape 2: Indlæsning af ikke-bygning');
      yield proddb.withTransaction('READ_WRITE', client => go(function* () {
        yield importWithoutEvents(client, 'migrate_1_31_0',
          [...grbbrTableModels.allTableModels.map(model => model.table), 'jordstykker'],
          txid => go(function* () {
            const importer = createOisImporter({
              dataDir: config.get('ois_dir'),
              entityNames: grbbrModels.map(model => model.name)
            });
            yield importer.execute(client, txid);
          }));
      }));
    }),
    () => go(function* () {
      logger.info('Etape 3: Beregning af historiske tabeller');
      yield proddb.withTransaction('READ_WRITE', client => go(function* () {
        const historyTables = Object.values(grbbrTableModels.getTableModels('history'))
          .map(tableModel => tableModel.table);
        const processors = grbbrProcessors.filter(processor => historyTables.includes(processor.produces[0]));
        yield importWithoutEvents(client, 'migrate_1_31_0',
          [...grbbrTableModels.allTableModels.map(model => model.table), 'jordstykker'],
          txid => go(function* () {
            for (let processor of processors) {
              yield processor.execute(client, txid, EXECUTION_STRATEGY.verify, {});
            }
          }));
      }));
    }),
    () => go(function* () {
      logger.info('Etape 4: Beregning af aktuelle tabeller samt jordstykker');
      yield proddb.withTransaction('READ_WRITE', client => go(function* () {
        const currentTables = Object.values(grbbrTableModels.getTableModels('current'))
          .map(tableModel => tableModel.table);
        const processors = grbbrProcessors.filter(processor => currentTables.includes(processor.produces[0]));
        yield importWithoutEvents(client, 'migrate_1_31_0',
          [...grbbrTableModels.allTableModels.map(model => model.table), 'jordstykker'],
          txid => go(function* () {
            for (let processor of processors) {
              yield processor.execute(client, txid, EXECUTION_STRATEGY.verify, {});
            }
          }));
        yield client.query(
            `UPDATE jordstykker j
             SET grund_id=v.grund_id,
                 bfenummer=v.bfenummer,
                 ejendomsrelation_id=v.ejendomsrelation_id
             FROM jordstykker_view v
             WHERE j.featureid = v.featureid`);
        yield applyCurrentTableToChangeTable(client, tableSchema.tables.jordstykker, ['grund_id', 'bfenummer', 'ejendomsrelation_id']);
      }));
    })
  ];
  const etape = config.get('etape');
  if(etape === null) {
    for(let etape of etaper) {
      yield etape();
    }
  }
  else {
    yield etaper[etape]();
  }
}));
