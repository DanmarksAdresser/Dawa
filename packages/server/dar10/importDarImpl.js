"use strict";

const createDarDownloadImporter = require('../components/importers/dar-download');
const incrementalProcessors = require('../components/processors/incremental-processors');
const nonIncrementalProcessors = require('../components/processors/non-incremental-processors');
const { execute, executeIncrementally } = require('../components/processors/processor-util');

const importDownload = (client, txid, dataDir) => {
  const importer = createDarDownloadImporter({dataDir: dataDir});
  const components = [importer, ...incrementalProcessors, ...nonIncrementalProcessors];
  return execute(client, txid, components);
};

const importDownloadIncrementally = (client, txid, dataDir) => {
  const importer = createDarDownloadImporter({dataDir: dataDir});
  const components = [importer, ...incrementalProcessors, ...nonIncrementalProcessors];
  return executeIncrementally(client, txid, components);

};

const propagateIncrementalChanges = (client, txid) => {
  return executeIncrementally(client, txid, incrementalProcessors);
};

module.exports = {
  importDownload,
  importDownloadIncrementally,
  propagateIncrementalChanges
};
