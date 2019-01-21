#!/usr/bin/env node
"use strict";

const _ = require('underscore');
const { go, Abort } = require('ts-csp');

const { runImporter } = require('@dawadk/common/src/cli/run-importer');
const proddb = require('../psql/proddb');
const darApiClient = require('./darApiClient');
const logger = require('@dawadk/common/src/logger').forCategory('darImport');

const importFromApiImpl = require('./importFromApiImpl');

const optionSpec = {
  pgConnectionUrl: [false, 'URL som anvendes ved forbindelse til databasen', 'string'],
  darApiUri: [false, 'URI til DAR endpoint', 'string', 'https://sg.danmarksadresseregister.dk/AWSDeltaService'],
  notificationUrl: [false, 'WS URI til notifikationer', 'string', 'https://dar-notifications.aws.dk/prod/listen'],
  pollInterval: [false, 'Millisekunder mellem API poll for nye records', 'number', 5000],
  pretend: [false, 'Rul transaktion tilbage (ingen ændringer)', 'boolean', false],
  noDaemon: [false, 'Kør kun én import', 'boolean', false]
};

runImporter("importDar10Daemon", optionSpec, _.without(_.keys(optionSpec), 'notificationUrl'), (args, options) => go(function*()  {
  proddb.init({
    connString: options.pgConnectionUrl,
    pooled: false
  });
  const darClient = darApiClient.createClient(options.darApiUri);

  const importProcess = importFromApiImpl.importDaemon(proddb, darClient,
    {
      pretend: options.pretend,
      noDaemon: options.noDaemon,
      pollIntervalMs: options.pollInterval,
      notificationUrl: options.notificationUrl }
    );
  process.on('SIGTERM', () => {
    logger.info('Received SIGTERM, aborting');
    importProcess.abort.raise('Received SIGTERM, aborting');
  });
  process.on('SIGINT', () => {
    logger.info('Received SIGINT, aborting');
    importProcess.abort.raise('Received SIGINT, aborting');
  });
  try {
    yield importProcess;
  }
  catch(err) {
    if(err instanceof Abort) {
      logger.info('importDaemon stopped successfully');
    }
    else {
      throw err;
    }
  }
}));


