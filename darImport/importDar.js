"use strict";

var fs = require('fs');
var moment = require('moment');
var path = require('path');
var _ = require('underscore');
const { go } = require('ts-csp');

var cliParameterParsing = require('../bbr/common/cliParameterParsing');
var importDarImpl = require('./importDarImpl');
var logger = require('../logger').forCategory('darImport');
var proddb = require('../psql/proddb');
const { withImportTransaction } = require('../importUtil/importUtil');


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

  proddb.withTransaction('READ_WRITE',  (client) => go(function*() {
      try {
        if(clearDawa) {
          yield importDarImpl.clearDawa(client);
          logger.info('DAWA tables cleared');
        }
        if(initial) {
          yield importDarImpl.clearDarTables(client);
        }
        yield  importDarImpl.withDarTransaction(client, 'csv', () => go(function*() {
          yield withImportTransaction(client, 'importDar', (txid) => go(function*() {
            if (initial) {
              yield importDarImpl.initFromDar(client, txid, dataDir, clearDawa, skipDawa, skipRowsConfig);
            }
            else {
              yield importDarImpl.updateFromDar(client, txid, dataDir, fullCompare, skipDawa, skipRowsConfig, report);
            }
          }));
        }));

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

        logger.info('DAR CSV importer succeeded');
      }
      catch(err) {
        logger.error('Caught error in DAR CSV importer', err);
        throw err;
      }
    })).done();
});
