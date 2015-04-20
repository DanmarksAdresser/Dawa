"use strict";

var _ = require('underscore');

var cliParameterParsing = require('../bbr/common/cliParameterParsing');
var importDarImpl = require('./importDarImpl');
var importFromApiImpl = require('./importFromApiImpl');
var logger = require('../logger').forCategory('darImportApi');
var proddb = require('../psql/proddb');
var qUtil = require('../q-util');

var optionSpec = {
  pgConnectionUrl: [false, 'URL som anvendes ved forbindelse til databasen', 'string'],
  url: [false, 'Base URL hvorfra data hentes', 'string'],
  daemon: [false, 'Daemon mode. Keep running in background and download changes from API.', 'boolean', false]
};

cliParameterParsing.main(optionSpec, _.keys(optionSpec), function(args, options) {
  proddb.init({
    connString: options.pgConnectionUrl,
    pooled: false
  });

  var url = options.url;

  function doImport() {
    var report = {};
    return proddb.withTransaction('READ_WRITE', function (client) {
      return importDarImpl.withDarTransaction(client, 'api', function() {
        return importFromApiImpl.importFromApi(client, url, report);
      });
    }).then(function() {
      logger.debug('REPORT\n' + JSON.stringify(report, null, 2));
    });
  }

  var shouldContinue = true;

  function shutdown() {
    shouldContinue = false;
    console.log('Shutting down...');
  }

  if(options.daemon) {
    console.log('Running in daemon mode');
    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
    qUtil.awhile(function() {
      return shouldContinue;
    }, doImport).done();
  }
  else {
    doImport().done();
  }
});