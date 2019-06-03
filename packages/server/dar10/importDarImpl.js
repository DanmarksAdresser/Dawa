"use strict";

const createDarDownloadImporter = require('../components/importers/dar-download');
const { execute } = require('../components/execute');
const { EXECUTION_STRATEGY } = require('../components/common');

const doImport = (client, txid, dataDir, strategy) => {
  const importer = createDarDownloadImporter({dataDir: dataDir});
  return execute(client, txid, [importer], strategy);
}
const importDownload = (client, txid, dataDir) => {
  return doImport(client, txid, dataDir, EXECUTION_STRATEGY.verify);
};

const importDownloadIncrementally = (client, txid, dataDir) => {
  return doImport(client, txid, dataDir, EXECUTION_STRATEGY.slow);
};

module.exports = {
  importDownload,
  importDownloadIncrementally
};
