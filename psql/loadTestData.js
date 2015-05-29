"use strict";

var async = require('async');
var q = require('q');
var _ = require('underscore');

var initialization = require('./initialization');
var cliParameterParsing = require('../bbr/common/cliParameterParsing');
var logger = require('../logger');
var loadStormodtagereImpl = require('./loadStormodtagereImpl');
var loadAdresseDataImpl = require('./load-adresse-data-impl');
var proddb = require('./proddb');
var runScriptImpl = require('./run-script-impl');
var temaer = require('../apiSpecification/temaer/temaer');
var tema = require('../temaer/tema');
var updateEjerlavImpl = require('./updateEjerlavImpl');
var updatePostnumreImpl = require('./updatePostnumreImpl');

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
    return q.nfcall(async.series, [
      // load schemas
      initialization.loadSchemas(client, scriptDir),
      // run init functions
      initialization.disableTriggersAndInitializeTables(client),
      // load postnumre
      function(callback) {
        updatePostnumreImpl(client, 'data/postnumre.csv').then(function(result) {
          callback(null, result);
        }, function(err) {
          callback(err);
        });
      },
      function(callback) {
        loadStormodtagereImpl(client, 'data/stormodtagere.csv', callback);
      },
      function(callback) {
        updateEjerlavImpl(client, 'data/ejerlav.csv', callback).then(function() {
          callback(null);
        }, function(err) {
          callback(err);
        });
      },
      function(callback) {
        runScriptImpl(client, ['psql/load-dagi-test-data.sql'], false, callback);
      },
      function(callback) {
        loadAdresseDataImpl.load(client, {
          dataDir: 'test/data'
        }, callback);
      },
      function(callback) {
        async.eachSeries(temaer, function(temaDef, callback) {
          tema.updateAdresserTemaerView(client, temaDef, true, callback  );
        }, callback);
      },
      function(callback) {
        client.query('analyze', callback);
      }
    ]);
  }).done();
});

