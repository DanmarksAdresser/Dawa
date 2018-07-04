"use strict";

const {go} = require('ts-csp');
const _ = require('underscore');

const {runImporter} = require('../importUtil/runImporter');
const importDarImpl = require('./importDarImpl');
const proddb = require('../psql/proddb');
const { withImportTransaction } = require('../importUtil/importUtil');
const {makeChangesNonPublic} = require('../importUtil/materialize');
const tableSchema = require('../psql/tableModel');


const optionSpec = {
  pgConnectionUrl: [false, 'URL som anvendes ved forbindelse til databasen', 'string'],
  dataDir: [false, 'Folder med NDJSON-filer', 'string'],
};

runImporter('importDar10', optionSpec, _.keys(optionSpec), function (args, options) {
  proddb.init({
    connString: options.pgConnectionUrl,
    pooled: false
  });

  return proddb.withTransaction('READ_WRITE', client => go(function*() {
    yield withImportTransaction(client, 'importDar', (txid) => go(function*() {
      yield importDarImpl.importIncremental(client, txid, options.dataDir, false);
      yield makeChangesNonPublic(client, txid, tableSchema.tables.dar1_Husnummer);
      yield makeChangesNonPublic(client, txid, tableSchema.tables.dar1_Husnummer_history);
      yield makeChangesNonPublic(client, txid, tableSchema.tables.dar1_Husnummer_current);
    }));
    yield client.query('REFRESH MATERIALIZED VIEW CONCURRENTLY wms_vejpunktlinjer');
  }));
});