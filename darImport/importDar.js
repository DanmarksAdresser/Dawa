"use strict";

var fs = require('fs');
var moment = require('moment');
var path = require('path');
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
  fullCompare: [false, 'Whether to make a full comparison', 'boolean', false],
  reportDir: [false, 'Directory where report from run will be stored', 'string'],
  skipDawa: [false, 'Do not update DAWA tables', 'boolean', false],
  skipRows: [false, 'Path to file with rows to skip', 'string']
};

cliParameterParsing.main(optionSpec, _.without(_.keys(optionSpec), 'reportDir', 'skipRows'), function(args, options) {
  var dataDir = options.dataDir;
  var initial = options.initial;
  var clearDawa = options.clear;
  var fullCompare = options.fullCompare;
  var skipDawa = options.skipDawa;
  proddb.init({
    connString: options.pgConnectionUrl,
    pooled: false
  });
  var skipRowsConfig = {
    adgangspunkt: [],
    husnummer: [],
    adresse: []
  };
  if(options.skipRows) {
    skipRowsConfig = JSON.parse(fs.readFileSync(options.skipRows));
  }

  var report = {};

  proddb.withTransaction('READ_WRITE', function (client) {
    return q.async(function*() {
      try {
        if(clearDawa) {
          yield importDarImpl.clearDawa(client);
          logger.info('DAWA tables cleared');
        }
        if(initial) {
          yield importDarImpl.clearDarTables(client);
        }
        yield  importDarImpl.withDarTransaction(client, 'csv', function() {
          if(initial) {
            return importDarImpl.initFromDar(client, dataDir, clearDawa, skipDawa, skipRowsConfig);
          }
          else {
            return importDarImpl.updateFromDar(client, dataDir, fullCompare, skipDawa, skipRowsConfig, report);
          }
        });

        if(clearDawa) {
          yield sqlCommon.withoutTriggers(client, function() {
            return q.async(function*() {
              yield client.queryp('analyze');
              yield initialization.initializeTables(client);
            })();
          });
        }

        yield client.queryp('select vejstykkerpostnumremat_init()');

        if(options.reportDir) {
          fs.writeFileSync(path.join(options.reportDir, 'report-'+ moment().toISOString() + '.json'), JSON.stringify(report, null, undefined));
        }
        ['adgangspunkt', 'husnummer', 'adresse'].forEach(function(entity) {
          if (report && report['dar_' + entity]) {
            ['insert', 'update', 'delete'].forEach(function (op) {
              var changes = report['dar_' + entity][op];
              if (changes.length !== 0) {
                logger.info('Importer changes', {
                  op: op,
                  entity: entity,
                  changes: changes.length
                });
              }
              else {
                logger.info('No importer changes', {
                  op: op,
                  entity: entity
                });
              }
            });
          }
        });

        logger.info('Successfully completed importDar script');
      }
      catch(err) {
        logger.error('Caught error in importDar', err);
        throw err;
      }
    })();
  }).done();
});
