"use strict";

var q = require('q');
const {go} = require('ts-csp');
var initialization = require('./initialization');
var cliParameterParsing = require('../bbr/common/cliParameterParsing');
var generateHistoryImpl = require('../history/generateHistoryImpl');
var logger = require('../logger');
var loadCsvTestdata = require('./loadCsvTestdata');
var loadStormodtagereImpl = require('./loadStormodtagereImpl');
var proddb = require('./proddb');
const {importTemaerJson} = require('../dagiImport/importDagiImpl');
var updateEjerlavImpl = require('./updateEjerlavImpl');
var updatePostnumreImpl = require('./updatePostnumreImpl');
const importDarImpl = require('../darImport/importDarImpl');
const importJordstykkerImpl = require('../matrikeldata/importJordstykkerImpl');
const importOisImpl = require('../ois/importOisImpl');
const {withImportTransaction} = require('../importUtil/importUtil');
const importStednavneImpl = require('../stednavne/importStednavneImpl');
const temaModels = require('../dagiImport/temaModels');

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
        yield updatePostnumreImpl(client, txid, 'data/postnumre.csv');
        yield loadStormodtagereImpl(client, txid, 'data/stormodtagere.csv');
        yield updateEjerlavImpl(client, txid, 'data/ejerlav.csv');
        const temaNames = temaModels.modelList.map(tema => tema.singular);
        yield importTemaerJson(client, txid, temaNames, 'test/data/dagi', '', 1000000);
      }));
      yield loadCsvTestdata(client, 'test/data');
      yield withImportTransaction(client, 'loadtestData', (txid) => go(function* () {
        yield importDarImpl.updateVejstykkerPostnumreMat(client, txid);
        yield importDarImpl.updatePostnumreKommunekoderMat(client);
        yield importDarImpl.updateSupplerendeBynavne(client);
      }));
      client.allowParallelQueries = true;
      yield generateHistoryImpl.generateAdgangsadresserHistory(client);
      yield generateHistoryImpl.generateAdresserHistory(client);
      client.allowParallelQueries = false;
      yield withImportTransaction(client, 'loadtestData', (txid) => go(function* () {
        yield importJordstykkerImpl.importJordstykkerImpl(client, txid, 'test/data/matrikelkort', true);
      }));
      yield importOisImpl.importOis(client, 'test/data/ois');
      yield withImportTransaction(client, 'loadTestData', txid => importStednavneImpl.importStednavne(client, txid, 'test/data/Stednavn.json'));
      yield client.query('analyze');
    })();
  }).done();
});

