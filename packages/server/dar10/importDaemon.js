#!/usr/bin/env node
"use strict";

const _ = require('underscore');

const { runImporter } = require('@dawadk/common/src/cli/run-importer');
const proddb = require('../psql/proddb');
const { Signal } = require("ts-csp");

const importFromApiImpl = require('./importFromApiImpl');

const optionSpec = {
  pgConnectionUrl: [false, 'URL som anvendes ved forbindelse til databasen', 'string'],
  darApiUri: [false, 'URI til DAR endpoint', 'string', 'https://sg.danmarksadresseregister.dk/AWSDeltaService'],
  notificationUrl: [false, 'WS URI til notifikationer', 'string'],
  pollInterval: [false, 'Millisekunder mellem API poll for nye records', 'number', 5000],
  pretend: [false, 'Rul transaktion tilbage (ingen ændringer)', 'boolean', false],
  noDaemon: [false, 'Kør kun én import', 'boolean', false],
  importFuture: [false, 'Anvend virkningstid 14 dage i fremtiden i stedet for aktuel tid', 'boolean', false]
};

runImporter("importDar10Daemon", optionSpec, _.without(_.keys(optionSpec), 'notificationUrl'), function(args, options) {
  proddb.init({
    connString: options.pgConnectionUrl,
    pooled: false
  });
  const abortSignal = new Signal();
  return importFromApiImpl.importDaemon(options.darApiUri,
    options.pollInterval,
    options.notificationUrl,
    options.pretend,
    options.noDaemon,
    options.importFuture,
    abortSignal);
});


