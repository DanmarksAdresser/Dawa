const path = require('path');
const _ = require('underscore');
const {go} = require('ts-csp');
const generateHistoryImpl = require('../history/generateCombinedHistoryImpl');
var loadCsvTestdata = require('./loadCsvTestdata');
var loadStormodtagereImpl = require('./loadStormodtagereImpl');
const importDagiImpl = require('../dagiImport/importDagiImpl');
const importDar10Impl = require('../dar10/importDarImpl');
const importJordstykkerImpl = require('../matrikeldata/importJordstykkerImpl');
const importOisImpl = require('../ois/importOisImpl');
const {withImportTransaction} = require('../importUtil/transaction-util');
const importStednavneImpl = require('../stednavne/importStednavneImpl');
const temaModels = require('../dagiImport/temaModels');
const importBrofasthedImpl = require("../stednavne/importBrofasthedImpl");
const importHeightsImpl = require('../heights/importAdresseHeightsImpl');
const importBygningerImpl = require('../bygninger/importBygningerImpl');
const importVejmidterImpl = require('../vejmidter/importVejmidterImpl');
const logger = require('@dawadk/common/src/logger').forCategory('loadTestData');
const initializeData = client => go(function*() {
  logger.info('Importing raw CSV');
  yield withImportTransaction(client, 'loadtestData', (txid) => go(function* () {
    yield loadCsvTestdata(client, txid, path.join(__dirname, '../test/data'));
  }));
  logger.info('Importing vejmidter');
  yield withImportTransaction(client, 'loadtestData', (txid) => go(function* () {
    yield importVejmidterImpl.importVejmidter(client, txid, path.join(__dirname, '../test/data/VejmidtTest.json'));
  }));
  logger.info('Importing stormodtagere');
  yield withImportTransaction(client, 'loadtestData', (txid) => go(function* () {
    yield loadStormodtagereImpl(client, txid, path.join(__dirname, '../data/stormodtagere.csv'));
  }));
  logger.info('Importing DAGI');
  yield withImportTransaction(client, 'loadtestData', (txid) => go(function* () {
    const temaNames = _.without(temaModels.modelList.map(tema => tema.singular), 'landpostnummer');
    yield importDagiImpl(client, txid, temaNames, null, path.join(__dirname, '../test/data/dagi'), '', 'json', 10000);
  }));
  logger.info('Importing DAR 1.0');
  yield withImportTransaction(client, 'loadtestData', (txid) => go(function* () {
    yield importDar10Impl.importDownload(client, txid, path.join(__dirname, '../test/data/dar10'));
  }));

  logger.info('importing Heights');
  yield withImportTransaction(client, 'loadtestData', (txid) => go(function* () {
    yield importHeightsImpl.importHeights(client, txid, path.join(__dirname, '../test/data/hoejder.csv'));
  }));
  logger.info('Generating history');
  client.allowParallelQueries = true;
  yield withImportTransaction(client, 'loadtestData', (txid) => go(function* () {
    yield generateHistoryImpl.generateHistory(client, txid, '2018-05-05T00:00:00.000Z');
  }));
  logger.info('Importing OIS');
  yield importOisImpl.importOis(client, path.join(__dirname, '../test/data/ois'));
  logger.info('Importing jordstykker');
  client.allowParallelQueries = false;
  yield withImportTransaction(client, 'loadtestData', (txid) => go(function* () {
    yield importJordstykkerImpl.importJordstykkerImpl(client, txid, path.join(__dirname, '../test/data/matrikelkort'), true);
  }));
  logger.info('Importing stednavne');
  yield importStednavneImpl.importStednavne(client, path.join(__dirname, '../test/data/Stednavn.json'), 10000);
  logger.info('Importing brofasthed');
  yield withImportTransaction(client, 'loadTestData', txid => importBrofasthedImpl(client, txid, path.join(__dirname, '../test/data/brofasthed.csv')));
  logger.info('Importing bygninger');
  yield withImportTransaction(client, 'loadTestData', txid => importBygningerImpl.importBygninger(client, txid, path.join(__dirname, '../test/data/bygninger.json'), 10000));
  yield client.query('analyze');
});

module.exports = {
  initializeData
};