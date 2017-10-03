"use strict";

const {go} = require('ts-csp');
const _ = require('underscore');

const {runImporter} = require('../importUtil/runImporter');
const importDarImpl = require('./importDarImpl');
const proddb = require('../psql/proddb');
const { withImportTransaction } = require('../importUtil/importUtil');


const optionSpec = {
  pgConnectionUrl: [false, 'URL som anvendes ved forbindelse til databasen', 'string'],
  dataDir: [false, 'Folder med NDJSON-filer', 'string'],
  skipDawa: [false, 'Skip DAWA updates', 'boolean', false],
  clear: [false, 'Ryd gamle DAR 1.0 data', 'boolean', false]
};

runImporter('importDar10', optionSpec, _.keys(optionSpec), function (args, options) {
  proddb.init({
    connString: options.pgConnectionUrl,
    pooled: false
  });

  return proddb.withTransaction('READ_WRITE', client => go(function*() {
    yield withImportTransaction(client, 'importDar', (txid) => go(function*() {
      if (options.clear) {
        yield importDarImpl.clearDar(client);
      }
      yield importDarImpl.importFromFiles(client, txid, options.dataDir, options.skipDawa);
    }));
    yield client.query('REFRESH MATERIALIZED VIEW CONCURRENTLY wms_vejpunktlinjer');
  }));
});
