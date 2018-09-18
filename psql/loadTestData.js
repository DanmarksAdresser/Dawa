"use strict";

const _ = require('underscore');
var q = require('q');
const {go} = require('ts-csp');
var initialization = require('./initialization');
var cliParameterParsing = require('../bbr/common/cliParameterParsing');
const generateHistoryImpl = require('../history/generateCombinedHistoryImpl');
var logger = require('../logger');
var loadCsvTestdata = require('./loadCsvTestdata');
var loadStormodtagereImpl = require('./loadStormodtagereImpl');
var proddb = require('./proddb');
const {importTemaerJson, importLandpostnummer} = require('../dagiImport/importDagiImpl');
// var updateEjerlavImpl = require('./updateEjerlavImpl');
const importDar10Impl = require('../dar10/importDarImpl');
const importJordstykkerImpl = require('../matrikeldata/importJordstykkerImpl');
const importOisImpl = require('../ois/importOisImpl');
const {withImportTransaction} = require('../importUtil/importUtil');
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
      // run init functions
      yield initialization.disableTriggersAndInitializeTables(client);
      yield withImportTransaction(client, 'loadtestData', (txid) => go(function* () {
        yield loadStormodtagereImpl(client, txid, 'data/stormodtagere.csv');
        // yield updateEjerlavImpl(client, txid, 'data/ejerlav.csv');
        const temaNames = _.without(temaModels.modelList.map(tema => tema.singular), 'landpostnummer');
        yield importTemaerJson(client, txid, temaNames, 'test/data/dagi', '', 1000000);
        yield importLandpostnummer(client, txid);
      }));
      yield withImportTransaction(client, 'loadtestData', (txid) => go(function* () {
        yield importDar10Impl.importInitial(client, txid, 'test/data/dar10', false, true);
      }));
      yield withImportTransaction(client, 'loadtestData', (txid) => go(function* () {
        yield importHeightsImpl.importHeights(client, txid, 'test/data/hoejder.csv');
      }));
      yield loadCsvTestdata(client, 'test/data');
      client.allowParallelQueries = true;
      yield generateHistoryImpl.generateHistory(client, '2018-05-04T00:00:00.000Z');
      client.allowParallelQueries = false;
      yield withImportTransaction(client, 'loadtestData', (txid) => go(function* () {
        yield importJordstykkerImpl.importJordstykkerImpl(client, txid, 'test/data/matrikelkort', true);
      }));
      yield importOisImpl.importOis(client, 'test/data/ois');
      yield withImportTransaction(client, 'loadTestData', txid => importStednavneImpl.importStednavne(client, txid, 'test/data/Stednavn.json'));
      yield withImportTransaction(client, 'loadTestData', txid => importBrofasthedImpl(client, txid, 'test/data/brofasthed.csv'));
      yield withImportTransaction(client, 'loadTestData', txid => importBygningerImpl.importBygninger(client, txid, 'test/data/bygninger.json'));
      yield client.query('analyze');
    })();
  }).done();
});

