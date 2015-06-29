"use strict";

var q = require('q');
var _ = require('underscore');

var cliParameterParsing = require('../bbr/common/cliParameterParsing');
var importDarImpl = require('./importDarImpl');
var initialization = require('../psql/initialization');
var logger = require('../logger').forCategory('darImport');
var proddb = require('../psql/proddb');
var sqlCommon = require('../psql/common');

var optionSpec = {
  pgConnectionUrl: [false, 'URL som anvendes ved forbindelse til databasen', 'string'],
  dataDir: [false, 'Folder med CSV-filer', 'string'],
  initial: [false, 'Whether this is an initial import', 'boolean', false],
  clear: [false, 'Completely remove old DAWA data and history', 'boolean', false],
  fullCompare: [false, 'Whether to make a full comparison', 'boolean', false]
};

cliParameterParsing.main(optionSpec, _.keys(optionSpec), function(args, options) {
  var dataDir = options.dataDir;
  var initial = options.initial;
  var clearDawa = options.clear;
  var fullCompare = options.fullCompare;
  proddb.init({
    connString: options.pgConnectionUrl,
    pooled: false
  });

  var report = {};

  proddb.withTransaction('READ_WRITE', function (client) {
    return q()
      .then(function() {
        if(clearDawa) {
          return importDarImpl.clearDawa(client).then(function() {
            logger.info('DAWA tables cleared');
          });
        }
      })
      .then(function() {
        if(initial) {
          return importDarImpl.clearDarTables(client);
        }
      })
      .then(function() {
        return importDarImpl.withDarTransaction(client, 'csv', function() {
          if(initial) {
            return importDarImpl.initFromDar(client, dataDir, clearDawa);
          }
          else {
            return importDarImpl.updateFromDar(client, dataDir, fullCompare, report);
          }
      });
    })
    .then(function() {
      if(clearDawa) {
        return sqlCommon.withoutTriggers(client, function() {
          return client.queryp('analyze;').then(function() {
            return q.nfcall(initialization.initializeTables(client));
          });
        });
      }
    });
  })
    .then(function() {
    logger.info('Successfully completed importDar script');
  })
    .catch(function(err) {
    logger.error('Caught error in importDar', err);
    return q.reject(err);
  })
    .done();
});