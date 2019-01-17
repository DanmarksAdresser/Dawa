"use strict";

const path = require('path');
const {go} = require('ts-csp');
const cliParameterParsing = require('@dawadk/common/src/cli/cli-parameter-parsing');
const proddb = require('./proddb');

const {withImportTransaction} = require('../importUtil/transaction-util');
const {reloadDatabaseCode} = require('./initialization');
const { clearAndMaterialize } = require('@dawadk/import-util/src/materialize');
const tableSchema = require('./tableModel');

const optionSpec = {
  pgConnectionUrl: [false, 'URL som anvendes ved forbindelse til test database', 'string']
};

cliParameterParsing.main(optionSpec, Object.keys(optionSpec), function (args, options) {
  proddb.init({
    connString: options.pgConnectionUrl,
    pooled: false
  });
  proddb.withTransaction('READ_WRITE', (client) => go(function* () {
    return yield withImportTransaction(client, 'migrate_1_26_0', txid => go(function* () {
      yield client.query(`
ALTER TABLE adgangsadresser_mat ADD COLUMN vejpunkt_ændret timestamp;
ALTER TABLE adgangsadresser_mat_changes ADD COLUMN vejpunkt_ændret timestamp;
ALTER TABLE adresser_mat ADD COLUMN vejpunkt_ændret timestamp;
ALTER TABLE adresser_mat_changes ADD COLUMN vejpunkt_ændret timestamp;
      `);
      yield reloadDatabaseCode(client, path.join(__dirname, 'schema'));
      yield clearAndMaterialize(client, txid, tableSchema.tables, tableSchema.materializations.adgangsadresser_mat);
      yield clearAndMaterialize(client, txid, tableSchema.tables, tableSchema.materializations.adresser_mat);
    }));
  })).done();
});

