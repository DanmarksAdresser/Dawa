"use strict";

var winston        = require('winston');
var _ = require('underscore');

var logglyOptions = {subdomain        : 'dawa',
                     inputToken       : process.env.DAWALOGGLY,
                     json             : true,
                     handleExceptions : true};

var cluster = require('cluster');
var workers = {};
var count = require('os').cpus().length;

var cluseringDisabled = process.env.clusteringDisabled === 'true';

function setupWorker() {
  var express        = require("express");
  var expressWinston = require('express-winston');
  var dawaPgApi      = require('./dawaPgApi');
  var documentation = require('./documentation');
  require('./apiSpecification/allSpecs');
  var app = express();

  function setupLogging(app){
    require('winston-loggly');
    if (process.env.DAWALOGGLY){
      winston.add(winston.transports.Loggly, logglyOptions);
      winston.info("Production mode. Setting up Loggly logging %s", process.env.DAWALOGGLY);
    }
    app.use(expressWinston.logger({transports: expressLogTransports()}));
    winston.handleExceptions(new winston.transports.Console());
  }

  setupLogging(app);

  app.use(express.compress());
  app.use(express.static(__dirname + '/public', {maxAge: 86400000}));


  var listenPort = process.env.PORT || 3000;

  app.use('', dawaPgApi.setupRoutes());
  app.use('', documentation);

  app.use(expressWinston.errorLogger({transports: expressLogTransports()}));

  app.listen(listenPort);
  winston.info("Express server listening on port %d in %s mode", listenPort, app.settings.env);
}

function setupMaster() {
  var cliParameterParsing = require('./bbr/common/cliParameterParsing');
  var optionSpec = {
    pgConnectionUrl: [false, 'URL som anvendes ved forbindelse til databasen', 'string'],
    listenPort: [false, 'TCP port der lyttes på', 'number', 3000]
  };

  cliParameterParsing.main(optionSpec, _.keys(optionSpec), function(args, options) {

    for (var i = 0; i < count; i++) {
      console.log("spawning with options %j", options);
      spawn(options);
    }

    cluster.on('exit', function (worker, code, signal) {
      winston.info('worker %d died (%s %s). restarting...', worker.process.pid, signal, code);
      delete workers[worker.pid];
      spawn(options);
    });
  });
}

if (cluster.isMaster) {
  if(cluseringDisabled) {
    setupWorker();
  }
  else {
    setupMaster();
  }

} else {
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

function expressLogTransports(){
  var transports = [];
  if (process.env.DAWALOGGLY){
    transports.push(new winston.transports.Loggly(logglyOptions));
  }
  transports.push(new winston.transports.Console());
  return transports;
}