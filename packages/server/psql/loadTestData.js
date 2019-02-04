"use strict";

const path = require('path');
const _ = require('underscore');
var q = require('q');
const {go} = require('ts-csp');
var initialization = require('./initialization');
var cliParameterParsing = require('@dawadk/common/src/cli/cli-parameter-parsing');
const generateHistoryImpl = require('../history/generateCombinedHistoryImpl');
var logger = require('@dawadk/common/src/logger');
var loadCsvTestdata = require('./loadCsvTestdata');
var loadStormodtagereImpl = require('./loadStormodtagereImpl');
var proddb = require('./proddb');
const {importTemaerJson, importLandpostnummer} = require('../dagiImport/importDagiImpl');
const importDar10Impl = require('../dar10/importDarImpl');
const importJordstykkerImpl = require('../matrikeldata/importJordstykkerImpl');
const importOisImpl = require('../ois/importOisImpl');
const {withImportTransaction} = require('../importUtil/transaction-util');
const importStednavneImpl = require('../stednavne/importStednavneImpl');
const temaModels = require('../dagiImport/temaModels');
const importBrofasthedImpl = require("../stednavne/importBrofasthedImpl");
const importHeightsImpl = require('../heights/importAdresseHeightsImpl');
const importBygningerImpl = require('../bygninger/importBygningerImpl');

var optionSpec = {
  pgConnectionUrl: [false, 'URL som anvendes ved forbindelse til test database', 'string']
};


var scriptDir = __dirname + '/schema';

cliParameterParsing.main(optionSpec, Object.keys(optionSpec), function (args, options) {
  proddb.init({
    connString: options.pgConnectionUrl,
    pooled: false
  });
  logger.setThreshold('sql', 'warn');
  logger.setThreshold('stat', 'warn');

  proddb.withTransaction('READ_WRITE', function (client) {
    return q.async(function* () {
      // load schemas
      yield initialization.loadSchemas(client, scriptDir);
      yield withImportTransaction(client, 'loadtestData', (txid) => go(function* () {
        yield loadCsvTestdata(client, txid, path.join(__dirname, '../test/data'));
      }));
      // CSV test data
      yield withImportTransaction(client, 'loadtestData', (txid) => go(function* () {
        yield loadStormodtagereImpl(client, txid, path.join(__dirname, '../data/stormodtagere.csv'));
        // yield updateEjerlavImpl(client, txid, 'data/ejerlav.csv');
        const temaNames = _.without(temaModels.modelList.map(tema => tema.singular), 'landpostnummer');
        yield importTemaerJson(client, txid, temaNames, path.join(__dirname, '../test/data/dagi'), '', 10000);
        yield importLandpostnummer(client, txid);
      }));
      yield withImportTransaction(client, 'loadtestData', (txid) => go(function* () {
        yield importDar10Impl.importDownload(client, txid, path.join(__dirname, '../test/data/dar10'));
      }));
      yield withImportTransaction(client, 'loadtestData', (txid) => go(function* () {
        yield importHeightsImpl.importHeights(client, txid, path.join(__dirname, '../test/data/hoejder.csv'));
      }));
      client.allowParallelQueries = true;
      yield generateHistoryImpl.generateHistory(client, '2018-05-04T00:00:00.000Z');
      client.allowParallelQueries = false;
      yield withImportTransaction(client, 'loadtestData', (txid) => go(function* () {
        yield importJordstykkerImpl.importJordstykkerImpl(client, txid, path.join(__dirname, '../test/data/matrikelkort'), true);
      }));
      yield importOisImpl.importOis(client, path.join(__dirname, '../test/data/ois'));
      yield withImportTransaction(client, 'loadTestData', txid => importStednavneImpl.importStednavne(client, txid, path.join(__dirname, '../test/data/Stednavn.json'), 10000));
      yield withImportTransaction(client, 'loadTestData', txid => importBrofasthedImpl(client, txid, path.join(__dirname, '../test/data/brofasthed.csv')));
      yield withImportTransaction(client, 'loadTestData', txid => importBygningerImpl.importBygninger(client, txid, path.join(__dirname, '../test/data/bygninger.json'), 10000));
      yield client.query('analyze');
    })();
  }).done();
});

