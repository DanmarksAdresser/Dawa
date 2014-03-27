"use strict";

var express        = require("express");
var winston        = require('winston');
var expressWinston = require('express-winston');
var dawaPgApi      = require('./dawaPgApi');
var documentation = require('./documentation');
require('./apiSpecification/allSpecs');

var logglyOptions = {subdomain        : 'dawa',
                     inputToken       : process.env.DAWALOGGLY,
                     json             : true,
                     handleExceptions : true};

var app = express();

setupLogging(app);

app.use(express.compress());
app.use(express.static(__dirname + '/public', {maxAge: 86400000}));


var cluster = require('cluster');
var workers = {};
var count = require('os').cpus().length;

var cluseringDisabled = process.env.clusteringDisabled === 'true';

if (cluster.isMaster && !cluseringDisabled) {
  for (var i = 0; i < count; i++) {
    spawn();
  }

  cluster.on('exit', function(worker, code, signal) {
    winston.info('worker %d died (%s %s). restarting...', worker.process.pid, signal, code);
    delete workers[worker.pid];
    spawn();
  });

} else {

  var listenPort = process.env.PORT || 3000;

  app.use('', dawaPgApi.setupRoutes());
  app.use('', documentation);

  app.use(expressWinston.errorLogger({transports: expressLogTransports()}));

  app.listen(listenPort);
  winston.info("Express server listening on port %d in %s mode", listenPort, app.settings.env);
}


////////////////////////////////////////////////////////////////////////////////
//// Helper functions //////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////

function spawn(){
  var worker = cluster.fork();
  workers[worker.pid] = worker;
  return worker;
}

function setupLogging(app){
  require('winston-loggly');
  if (process.env.DAWALOGGLY){
    winston.add(winston.transports.Loggly, logglyOptions);
    winston.info("Production mode. Setting up Loggly logging %s", process.env.DAWALOGGLY);
  }
  app.use(expressWinston.logger({transports: expressLogTransports()}));
  winston.handleExceptions(new winston.transports.Console());
}

function expressLogTransports(){
  var transports = [];
  if (process.env.DAWALOGGLY){
    transports.push(new winston.transports.Loggly(logglyOptions));
  }
  transports.push(new winston.transports.Console());
  return transports;
}