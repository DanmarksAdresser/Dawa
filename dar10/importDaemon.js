"use strict";

const _ = require('underscore');

const cliParameterParsing = require('../bbr/common/cliParameterParsing');
const proddb = require('../psql/proddb');

// Load common root CAs. Needed for connecting to DAR endpoint.
require('ssl-root-cas').inject().addFile(__dirname + '/comodo-rsa-domain-validation-sha-2-intermediates.ca-bundle');

const importFromApiImpl = require('./importFromApiImpl');

const optionSpec = {
  pgConnectionUrl: [false, 'URL som anvendes ved forbindelse til databasen', 'string'],
  darApiUri: [false, 'URI til DAR endpoint', 'string', 'https://pp-sg.danmarksadresseregister.dk/AWSDeltaService'],
  pollInterval: [false, 'Millisekunder mellem API poll for nye records', 'number', 5000]
};

cliParameterParsing.main(optionSpec, _.keys(optionSpec), function(args, options) {
  proddb.init({
    connString: options.pgConnectionUrl,
    pooled: false
  });
  importFromApiImpl.importDaemon(options.darApiUri, options.pollInterval);
});


