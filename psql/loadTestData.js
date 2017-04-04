"use strict";

var q = require('q');
const  {go} = require('ts-csp');
var initialization = require('./initialization');
var cliParameterParsing = require('../bbr/common/cliParameterParsing');
var generateHistoryImpl = require('../history/generateHistoryImpl');
var logger = require('../logger');
var loadCsvTestdata = require('./loadCsvTestdata');
var loadStormodtagereImpl = require('./loadStormodtagereImpl');
var proddb = require('./proddb');
var runScriptImpl = require('./run-script-impl');
var temaer = require('../apiSpecification/temaer/temaer');
var tema = require('../temaer/tema');
var updateEjerlavImpl = require('./updateEjerlavImpl');
var updatePostnumreImpl = require('./updatePostnumreImpl');
const importDarImpl = require('../darImport/importDarImpl');
const importBebyggelserImpl = require('../bebyggelser/importBebyggelserImpl');
const importJordstykkerImpl = require('../matrikeldata/importJordstykkerImpl');
const importOisImpl = require('../ois/importOisImpl');
const { withImportTransaction } = require('../importUtil/importUtil');

var optionSpec = {
  pgConnectionUrl: [false, 'URL som anvendes ved forbindelse til test database', 'string']
};


var scriptDir = __dirname + '/schema';

cliParameterParsing.main(optionSpec, Object.keys(optionSpec), function(args, options) {
  proddb.init({
    connString: options.pgConnectionUrl,
    pooled: false
  });
  logger.setThreshold('sql', 'warn');
  logger.setThreshold('stat', 'warn');

  proddb.withTransaction('READ_WRITE', function(client) {
    return q.async(function*() {
      // load schemas
      yield initialization.loadSchemas(client, scriptDir);
      // run init functions
      yield initialization.disableTriggersAndInitializeTables(client);
      yield withImportTransaction(client, 'loadtestData', (txid) => go(function*() {
        yield updatePostnumreImpl(client, txid, 'data/postnumre.csv');
        yield loadStormodtagereImpl(client, txid, 'data/stormodtagere.csv');
        yield updateEjerlavImpl(client, txid, 'data/ejerlav.csv')
      }));
      yield runScriptImpl(client, ['psql/load-dagi-test-data.sql'], false);
      yield loadCsvTestdata(client, 'test/data');
      yield importDarImpl.updateVejstykkerPostnumreMat(client, true);
      client.allowParallelQueries = true;
      yield generateHistoryImpl.generateAdgangsadresserHistory(client);
      yield generateHistoryImpl.generateAdresserHistory(client);
      client.allowParallelQueries = false;
      for(let temaDef of temaer) {
        yield tema.updateAdresserTemaerView(client, temaDef, true, 1000000, false);
      }
      yield importBebyggelserImpl.importBebyggelser(client, 'test/data/Bebyggelse.json', true, false);
      yield importJordstykkerImpl.importEjerlav(client, 'test/data/matrikelkort', '60851_GML_UTM32-EUREF89.zip', true);
      yield importOisImpl.importOis(client, 'test/data/ois');
      yield client.queryp('analyze');
    })();
  }).done();
});

