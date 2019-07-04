"use strict";
const _ = require('underscore');
const fs = require('fs');
const path = require('path');
const {go} = require('ts-csp');
const runConfigured = require('@dawadk/common/src/cli/run-configured');
const proddb = require('./proddb');
const configHolder = require('@dawadk/common/src/config/holder');
const {generateTemaTable, generateTilknytningTable} = require('../dagiImport/sqlGen');
const {reloadDatabaseCode} = require('./initialization');
const {createChangeTable, initChangeTable, applyCurrentTableToChangeTable} = require('@dawadk/import-util/src/table-diff');
const tableSchema = require('./tableModel');
const {importWithoutEvents, withImportTransaction} = require('../importUtil/transaction-util');
const importDagi = require('../dagiImport/importDagiImpl');
const featureMappingsDatafordeler = require('../dagiImport/featureMappingsDatafordeler');
const { jordstykkeColumns } = require('../components/importers/matrikel');
const { execute } = require('../components/execute');
const { EXECUTION_STRATEGY} = require('../components/common');
const { allProcessors } = require('../components/processors/all-processors');
const { derive } = require('@dawadk/import-util/src/table-diff-protocol');

const schema = configHolder.mergeConfigSchemas([
  {
    database_url: {
      doc: "URL for databaseforbindelse",
      format: 'string',
      default: null,
      cli: true,
      required: true
    },
    dagi_dir: {
      doc: "Placering af DAGI landsdele",
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
    yield client.query(generateTemaTable('landsdel'));
    yield client.query(generateTilknytningTable('landsdel'));
    yield client.query(fs.readFileSync(path.join(__dirname, 'schema/tables/tilknytninger_mat.sql'), {encoding: 'utf8'}));
    yield createChangeTable(client, tableSchema.tables.tilknytninger_mat);
    yield client.query(fs.readFileSync(path.join(__dirname, 'schema/tables/matrikel_jordstykker.sql'), {encoding: 'utf8'}));
    yield createChangeTable(client, tableSchema.tables.matrikel_jordstykker);
    yield client.query(fs.readFileSync(path.join(__dirname, 'schema/tables/vejnavne_mat.sql'), {encoding: 'utf8'}));
    yield createChangeTable(client, tableSchema.tables.vejnavne_mat);
    yield client.query(fs.readFileSync(path.join(__dirname, 'schema/tables/navngivenvejkommunedel_mat.sql'), {encoding: 'utf8'}));
    yield createChangeTable(client, tableSchema.tables.navngivenvejkommunedel_mat);
    yield client.query('alter table regioner add column nuts2 text');
    yield client.query('alter table regioner_changes add column nuts2 text');
    const jordstykkeColumnsWithGeo = [...jordstykkeColumns, 'geom'];
    yield reloadDatabaseCode(client, path.join(__dirname, 'schema'));
    yield withImportTransaction(client, 'migrate_1_30_0', txid => go(function*() {
      yield client.query(`INSERT INTO matrikel_jordstykker(${jordstykkeColumnsWithGeo.join(',')}) (select ${jordstykkeColumnsWithGeo.join(',')} FROM jordstykker)`);
      yield initChangeTable(client, txid, tableSchema.tables.matrikel_jordstykker);
      const tablesToVerify = ['jordstykker', 'tilknytninger_mat', 'vejnavne_mat','navngivenvejkommunedel_mat'];
      const processors = allProcessors.filter(
        processor => _.intersection(processor.produces, tablesToVerify).length > 0);
      yield execute(client, txid, processors, EXECUTION_STRATEGY.verify);
    }));
    yield importWithoutEvents(client, 'migrate_1_30_0',
      ['landsdele', 'landsdelstilknytninger'],
      txid => go(function* () {
        yield importDagi(client, txid,
          ['landsdel', 'region'],
          featureMappingsDatafordeler,
          config.get('dagi_dir'),
          '',
          'wfsMulti',
          5000000);
      }));
    yield withImportTransaction(client, 'migrate_1_30_0', txid => go(function*(){
      for(let table of ['stednavne', 'kommuner','dagi_supplerendebynavne', 'afstemningsomraader', 'menighedsraadsafstemningsomraader', 'regioner', 'politikredse', 'retskredse', 'sogne', 'opstillingskredse', 'storkredse', 'valglandsdele', 'ejerlav', 'jordstykker']) {
        const tableModel = tableSchema.tables[table];
        const tsvColumn = tableModel.columns.find(attr => attr.type === 'tsv');
        yield client.query(`update ${table} set tsv = ${derive(tsvColumn)(table)}`);
        yield applyCurrentTableToChangeTable(client, tableModel, ['tsv']);
      }
    }));
    yield withImportTransaction(client, 'migrate_1_30_0', txid => go(function*(){
      yield execute(client, txid, allProcessors, EXECUTION_STRATEGY.verify);
    }));
  }));
}));
