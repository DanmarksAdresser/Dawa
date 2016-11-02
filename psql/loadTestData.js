"use strict";

var q = require('q');

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
const importBebyggelserImpl = require('../bebyggelser/importBebyggelserImpl');
const importJordstykkerImpl = require('../matrikeldata/importJordstykkerImpl');

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
      yield updatePostnumreImpl(client, 'data/postnumre.csv');
      yield loadStormodtagereImpl(client, 'data/stormodtagere.csv');
      yield(updateEjerlavImpl(client, 'data/ejerlav.csv'));
      yield runScriptImpl(client, ['psql/load-dagi-test-data.sql'], false);
      yield loadCsvTestdata(client, 'test/data');
      yield generateHistoryImpl.generateAdgangsadresserHistory(client);
      yield generateHistoryImpl.generateAdresserHistory(client);
      for(let temaDef of temaer) {
        yield tema.updateAdresserTemaerView(client, temaDef, true, 1000000, false);
      }
      yield importBebyggelserImpl.importBebyggelser(client, 'test/data/Bebyggelse.json', true, false);
      yield importJordstykkerImpl.importEjerlav(client, 'test/data/matrikelkort', '60851_GML_UTM32-EUREF89.zip', true);
      yield client.queryp('analyze');
    })();
  }).done();
});

