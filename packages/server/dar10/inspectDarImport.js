"use strict";

const {go} = require('ts-csp');
const _ = require('underscore');

const {runImporter} = require('@dawadk/common/src/cli/run-importer');
const importDarImpl = require('./importDarImpl');
const proddb = require('../psql/proddb');
const { withImportTransaction } = require('../importUtil/importUtil');
const inspectImpl = require('../importUtil/inspectImpl');
const dar10TableModels = require('./dar10TableModels');



const optionSpec = {
  pgConnectionUrl: [false, 'URL som anvendes ved forbindelse til databasen', 'string'],
  dataDir: [false, 'Folder med NDJSON-filer', 'string'],
  entity: [false, 'DAR entity to inspect', 'string']
};

runImporter('importDar10', optionSpec, _.keys(optionSpec), function (args, options) {
  proddb.init({
    connString: options.pgConnectionUrl,
    pooled: false
  });

  return proddb.withTransaction('ROLLBACK', client => go(function*() {
    yield withImportTransaction(client, 'importDar', (txid) => go(function*() {
      yield importDarImpl.copyEntityToTable(client, options.entity, options.dataDir);
      const eventId = yield importDarImpl.getMaxEventId(client, 'fetch_', options.entity);
      yield importDarImpl.computeEntityDifferences(client, txid, options.entity, eventId);
      /* eslint no-console: 0 */
      console.log(JSON.stringify(yield inspectImpl(client, txid, dar10TableModels.rawTableModels[options.entity].table, null, true), null, 2));
    }));
  }));
});
