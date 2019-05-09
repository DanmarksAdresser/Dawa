#!/usr/bin/env node
"use strict";

const { go, Abort } = require('ts-csp');

const runConfiguredImporter  = require('@dawadk/import-util/src/run-configured-importer');
const proddb = require('../psql/proddb');
const darApiClient = require('./darApiClient');
const logger = require('@dawadk/common/src/logger').forCategory('darImport');

const importFromApiImpl = require('./importFromApiImpl');

const schema = {
  dar_api_uri: {
    doc: 'URI til DAR endpoint',
    format: 'String',
    default: 'https://sg.danmarksadresseregister.dk/AWSDeltaService'
  },
  notification_url: {
    doc: 'WS URI hvor importeren modtager notifikationer',
    format: 'String',
    default: 'https://dar-notifications.aws.dk/prod/listen'
  },
  poll_interval: {
    doc: 'Millisekunder mellem API poll for nye records',
    format: 'nat',
    default: 5000
  },
  no_daemon: {
    doc: 'Kør kun én import',
    format: 'Boolean',
    default: false,
    cli: true
  },
  pretend: {
    doc: 'Rul transaktion tilbage (ingen ændringer)',
    format: 'Boolean',
    default: false,
    cli: true
  },
  isalive_port: {
    doc: 'Port til isalive server',
    format: 'nat',
    default: 3000
  }
};

runConfiguredImporter("importDar10Daemon", schema, (config) => go(function*()  {
  proddb.init({
    connString: config.get('database_url'),
    pooled: false
  });
  const darClient = darApiClient.createClient(config.get('dar_api_uri'));

  const importProcess = importFromApiImpl.importDaemon(proddb, darClient,
    {
      pretend: config.get('pretend'),
      noDaemon: config.get('no_daemon'),
      pollIntervalMs: config.get('poll_interval'),
      notificationUrl: config.get('notification_url'),
      isalivePort: config.get('isalive_port')
    });
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


