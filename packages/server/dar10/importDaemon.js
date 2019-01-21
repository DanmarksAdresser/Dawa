#!/usr/bin/env node
"use strict";

const _ = require('underscore');
const { go } = require('ts-csp');

const { runImporter } = require('@dawadk/common/src/cli/run-importer');
const proddb = require('../psql/proddb');
const darApiClient = require('./darApiClient');

const importFromApiImpl = require('./importFromApiImpl');

const optionSpec = {
  pgConnectionUrl: [false, 'URL som anvendes ved forbindelse til databasen', 'string'],
  darApiUri: [false, 'URI til DAR endpoint', 'string', 'https://sg.danmarksadresseregister.dk/AWSDeltaService'],
  notificationUrl: [false, 'WS URI til notifikationer', 'string'],
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
  yield importProcess;
}));


