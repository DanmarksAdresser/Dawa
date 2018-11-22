"use strict";

const {go} = require('ts-csp');
const cliParameterParsing = require('../bbr/common/cliParameterParsing');
const proddb = require('./proddb');
const fs = require('fs');

const {withImportTransaction} = require('../importUtil/importUtil');
const {reloadDatabaseCode} = require('./initialization');
const { materializeFromScratch } = require('@dawadk/import-util/src/materialize');
const tableSchema = require('./tableModel');
const { createChangeTable } = require('@dawadk/import-util/src/table-diff');

const optionSpec = {
  pgConnectionUrl: [false, 'URL som anvendes ved forbindelse til test database', 'string']
};


cliParameterParsing.main(optionSpec, Object.keys(optionSpec), function (args, options) {
  proddb.init({
    connString: options.pgConnectionUrl,
    pooled: false
  });
  proddb.withTransaction('READ_WRITE', (client) => go(function* () {
    yield withImportTransaction(client, 'migrate_1_24_0', txid => go(function* () {
      yield client.query(fs.readFileSync('psql/schema/tables/supplerendebynavn2_postnr.sql', {encoding: 'utf8'}));
      yield createChangeTable(client, tableSchema.tables.supplerendebynavn2_postnr);
      const sql = `CREATE INDEX ON dar1_navngivenvejkommunedel_history(navngivenvej_id)`;

      for(let stmt of sql.split(';')) {
        yield client.query(stmt);
      }
    }));
    yield reloadDatabaseCode(client, 'psql/schema');
    yield withImportTransaction(client, 'migrate_1_24_0', txid => go(function* () {
      yield materializeFromScratch(client, txid, tableSchema.tables, tableSchema.materializations.supplerendebynavn2_postnr);
    }));

  })).done();
});


