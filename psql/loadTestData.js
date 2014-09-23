"use strict";

var _ = require('underscore');
var async = require('async');
var sqlCommon = require('./common');
var initialization = require('./initialization');
var cliParameterParsing = require('../bbr/common/cliParameterParsing');
var updatePostnumreImpl = require('./updatePostnumreImpl');
var loadStormodtagereImpl = require('./loadStormodtagereImpl');
var updateEjerlavImpl = require('./updateEjerlavImpl');
var loadAdresseDataImpl = require('./load-adresse-data-impl');
var runScriptImpl = require('./run-script-impl');
var temaer = require('../apiSpecification/temaer/temaer');
var dagi = require('../dagiImport/dagi');

var optionSpec = {
  pgConnectionUrl: [false, 'URL som anvendes ved forbindelse til test database', 'string']
};


function exitOnErr(err){
  if (err){
    console.dir(err);
    process.exit(1);
  }
}

var scriptDir = __dirname + '/schema';

cliParameterParsing.main(optionSpec, Object.keys(optionSpec), function(args, options) {
  sqlCommon.withWriteTransaction(options.pgConnectionUrl, function(err, client, commitFn) {
    if (err) {
      exitOnErr(err);
    }
    async.series([
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
        var temaNames = _.pluck(temaer, 'singular');
        async.eachSeries(temaNames, function(temaName, callback) {
          dagi.initAdresserTemaerView(client, temaName, callback);
        }, callback);
      }
    ], function(err) {
      exitOnErr(err);
      commitFn(null, function(err) {
        exitOnErr(err);
        console.log('Data indlæst med success');
      });
    });
  });
});

