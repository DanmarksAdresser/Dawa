"use strict";
var fs = require('fs');
var moment = require('moment');
var path = require('path');
var _ = require('underscore');

var {runImporter} = require('../importUtil/runImporter');
var importFromApiImpl = require('./importFromApiImpl')();
var logger = require('../logger').forCategory('darImportApi');
var proddb = require('../psql/proddb');

const {go} = require('ts-csp');

var optionSpec = {
  pgConnectionUrl: [false, 'URL som anvendes ved forbindelse til databasen', 'string'],
  url: [false, 'Base URL hvorfra data hentes', 'string'],
  daemon: [false, 'Daemon mode. Keep running in background and download changes from API.', 'boolean', false],
  reportDir: [false, 'Directory to store report files', 'string'],
  skipDawa: [false, 'Only update DAR tables, not DAWA tables', 'boolean', false]
};

runImporter("importFromApi", optionSpec, _.without(_.keys(optionSpec), 'reportDir'), function (args, options) {
  proddb.init({
    connString: options.pgConnectionUrl,
    pooled: false
  });

  var url = options.url;
  var skipDawa = options.skipDawa;

  function doImport() {
    return go(function*() {
      const report = {};
      yield importFromApiImpl.importFromApi(proddb, url, skipDawa, report);
      logger.info('Successfully ran importFromApi');
      if (options.reportDir) {
        fs.writeFileSync(path.join(options.reportDir, 'report-' + moment().toISOString() + '.json'), JSON.stringify(report, null, undefined));
      }
      logger.debug('REPORT\n' + JSON.stringify(report, null, 2));
    });
  }

  var shouldContinue = true;

  function shutdown() {
    shouldContinue = false;
    logger.info('Shutting down...');
  }

  return go(function*() {
    if (options.daemon) {
      process.on('SIGTERM', shutdown);
      process.on('SIGINT', shutdown);
      logger.info('Running in daemon mode');
      while (shouldContinue) {
        yield doImport();
      }
    }
    else {
      yield doImport();
    }
  });
});
