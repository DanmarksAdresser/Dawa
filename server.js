"use strict";

var fs = require('fs');
var logger = require('./logger');
var _ = require('underscore');

var cluster = require('cluster');
var workers = {};
var count = require('os').cpus().length;

function setupWorker() {
  var express        = require("express");
  var dawaPgApi      = require('./dawaPgApi');
  var documentation = require('./documentation');
  require('./apiSpecification/allSpecs');
  var app = express();


  app.use(express.compress());
  app.use(express.static(__dirname + '/public', {maxAge: 86400000}));


  var listenPort = process.env.listenPort || 3000;

  app.use('', dawaPgApi.setupRoutes());
  app.use('', documentation);

  app.listen(listenPort);
  logger.info("startup", "Express server listening for connections", {listenPort: listenPort, mode: app.settings.env});
}

function setupMaster() {
  var cliParameterParsing = require('./bbr/common/cliParameterParsing');
  var optionSpec = {
    pgConnectionUrl: [false, 'URL som anvendes ved forbindelse til databasen', 'string'],
    listenPort: [false, 'TCP port der lyttes på', 'number', 3000],
    disableClustering: [false, 'Deaktiver nodejs clustering, så der kun kører en proces', 'boolean']
  };

  cliParameterParsing.main(optionSpec, _.without(_.keys(optionSpec), 'disableClustering'), function(args, options) {
    var logOptions;
    if(options.logConfiguration) {
      var logOptionsStr = fs.readFileSync(options.logConfiguration);
      logOptions = JSON.parse(logOptionsStr);
    }
    else {
      logOptions = {};
    }
    logger.initialize(logOptions);
    if(options.disableClustering) {
      _.extend(process.env, options);
      setupWorker();
      return;
    }

    var workerOptions = {
      pgConnectionUrl: options.pgConnectionUrl,
      listenPort: options.listenPort,
      logOptions: JSON.stringify(logOptions)
    };
    for (var i = 0; i < count; i++) {
      spawn(workerOptions);
    }

    cluster.on('exit', function (worker, code, signal) {
      logger.error('master', 'Worker died. Restarting worker.', { pid: worker.process.pid, signal: signal, code: code});
      delete workers[worker.pid];
      spawn(workerOptions);
    });
  });
}

if (cluster.isMaster) {
  setupMaster();
} else {
  logger.initialize(JSON.parse(process.env.logOptions));
  setupWorker();
}


////////////////////////////////////////////////////////////////////////////////
//// Helper functions //////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////

function spawn(options){
  var worker = cluster.fork(options);
  workers[worker.pid] = worker;
  return worker;
}