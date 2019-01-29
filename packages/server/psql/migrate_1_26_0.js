"use strict";

const fs = require('fs');
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
      yield client.query(fs.readFileSync(path.join(__dirname, 'schema/tables/hoejder.sql')));
      yield client.query('INSERT INTO hoejde_importer_resultater(husnummerid, hoejde, position)' +
        '(select id,hoejde, st_setsrid(st_makepoint(z_x, z_y), 25832) from adgangsadresser)');
      yield client.query('ALTER TABLE adgangsadresser DROP COLUMN z_x');
      yield client.query('ALTER TABLE adgangsadresser DROP COLUMN z_y');
      yield client.query('ALTER TABLE adgangsadresser DROP COLUMN disableheightlookup');
      yield client.query('ALTER TABLE adgangsadresser DROP COLUMN disableheightlookup');
      yield reloadDatabaseCode(client, path.join(__dirname, 'schema'));
      yield clearAndMaterialize(client, txid, tableSchema.tables, tableSchema.materializations.hoejder);
      yield clearAndMaterialize(client, txid, tableSchema.tables, tableSchema.materializations.hoejde_importer_afventer);
      yield clearAndMaterialize(client, txid, tableSchema.tables, tableSchema.materializations.adgangsadresser_mat);
      yield clearAndMaterialize(client, txid, tableSchema.tables, tableSchema.materializations.adresser_mat);
    }));
  })).done();
});
