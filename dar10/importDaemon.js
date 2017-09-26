"use strict";

const _ = require('underscore');

const cliParameterParsing = require('../bbr/common/cliParameterParsing');
const logger = require('../logger');
const proddb = require('../psql/proddb');

const importFromApiImpl = require('./importFromApiImpl');

const optionSpec = {
  pgConnectionUrl: [false, 'URL som anvendes ved forbindelse til databasen', 'string'],
  darApiUri: [false, 'URI til DAR endpoint', 'string', 'https://pp-sg.danmarksadresseregister.dk/AWSDeltaService'],
  notificationUrl: [false, 'WS URI til notifikationer', 'string'],
  pollInterval: [false, 'Millisekunder mellem API poll for nye records', 'number', 5000],
  pretend: [false, 'Rul transaktion tilbage (ingen ændringer)', 'boolean', false]
};

cliParameterParsing.main(optionSpec, _.without(_.keys(optionSpec), 'notificationUrl'), function(args, options) {
  proddb.init({
    connString: options.pgConnectionUrl,
    pooled: false
  });
  importFromApiImpl.importDaemon(options.darApiUri, options.pollInterval, options.notificationUrl, options.pretend).catch(err => {
    logger.error('Import daemon error', err);
    throw err;
  }).done();
});


