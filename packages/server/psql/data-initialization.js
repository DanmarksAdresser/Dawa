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

const initializeData = client => go(function*() {
  yield withImportTransaction(client, 'loadtestData', (txid) => go(function* () {
    yield loadCsvTestdata(client, txid, path.join(__dirname, '../test/data'));
  }));
  yield withImportTransaction(client, 'loadtestData', (txid) => go(function* () {
    yield loadStormodtagereImpl(client, txid, path.join(__dirname, '../data/stormodtagere.csv'));
    const temaNames = _.without(temaModels.modelList.map(tema => tema.singular), 'landpostnummer');
    yield importDagiImpl(client, txid, temaNames, null, path.join(__dirname, '../test/data/dagi'), '', 'json', 10000);
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
  yield importStednavneImpl.importStednavne(client, path.join(__dirname, '../test/data/Stednavn.json'), 10000);
  yield withImportTransaction(client, 'loadTestData', txid => importBrofasthedImpl(client, txid, path.join(__dirname, '../test/data/brofasthed.csv')));
  yield withImportTransaction(client, 'loadTestData', txid => importBygningerImpl.importBygninger(client, txid, path.join(__dirname, '../test/data/bygninger.json'), 10000));
  yield client.query('analyze');
});

module.exports = {
  initializeData
};