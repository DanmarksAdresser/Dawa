"use strict";

var express        = require("express");
var compression = require('compression');
var http = require('http');
var logger = require('./logger');
var util = require('util');
var _ = require('underscore');

var cluster = require('cluster');
var isalive = require('./isalive');
var pg = require('pg');
const databasePools = require('./psql/databasePools');
require('pg-parse-float')(pg);

const { requestLimiter } = require('./psql/requestLimiter');


/**
 * We log memory statistics, so we can monitor memory consumption in splunk.
 * This does not work on windows.
 */
if(process.platform !== 'win32') {
  const gc = require('gc-stats')();
  gc.on('stats', (stats) => {
    if(stats.gctype === 2) {
      const logMeta = {
        pid: process.pid,
        before: stats.before.usedHeapSize,
        after: stats.after.usedHeapSize
      };
      logger.info('memory', 'stats', logMeta);
      if(stats.after.usedHeapSize > 768 * 1024 * 1024) {
        logger.error('memory','Memory limit exceeded. Exiting process.', logMeta);
        process.exit(1);
      }
    }
  });
}
function asInteger(stringOrNumber) {
  return _.isNumber(stringOrNumber) ? stringOrNumber : parseInt(stringOrNumber);
}

function socketTimeoutMiddleware(timeoutMillis) {
  return function(req, res, next) {
    res.socket.setTimeout(timeoutMillis);
    res.socket.setKeepAlive(true, 1000);
    next();
  };
}

function setupWorker() {
  var errorMessages = require('./haproxy/errorMessages');
  var proddb = require('./psql/proddb');
  var dboptions = {
    poolSize: asInteger(process.env.pgPoolSize),
    poolIdleTimeout: asInteger(process.env.pgPoolIdleTimeout),
    maxWaitingClients: asInteger(process.env.maxWaitingClients),
    statementTimeout: asInteger(process.env.statementTimeout),
    connString: process.env.pgConnectionUrl,
    pooled: true,
    requestLimiter
  };
  proddb.init(dboptions);
  databasePools.create('prod', dboptions);
  var dawaPgApi      = require('./dawaPgApi');
  var documentation = require('./documentation');
  require('./apiSpecification/allSpecs');

  process.on('message', function(message) {
    if(message.type === 'getStatus') {
      isalive.isaliveSlave(server).then(function(result) {
        result.requestId = message.requestId;
        process.send(result);
      }).catch(function(err) {
        logger.error('isalive', 'Unexpected error during isalive', err);
      });
    }
  });

  var app = express();

  app.use(socketTimeoutMiddleware(asInteger(process.env.socketTimeout)));

  // Hackish: We reduce memlevel to prevent zLib from caching too much internally
  // Otherwise, it will take too long for our application to start responding to JSON requests,
  // potentially resulting in a TCP disconnection.
  app.use(compression( {
    memLevel: 3
  }));
  app.use(express.static(__dirname + '/public', {maxAge: 10000}));


  var listenPort = process.env.listenPort || 3000;

  app.use('', dawaPgApi.setupRoutes());
  app.use('', documentation);

  app.get('/error/:error', function(req, res) {
    var error = req.params.error;
    if(_.contains(Object.keys(errorMessages), error)) {
      res.status(errorMessages[error].status);
      res.set('Content-Type', 'application/json');
      res.send(errorMessages[error].content);
    }
    else {
      res.sendStatus(404);
    }
  });

  var server = http.createServer(app);
  server.listen(listenPort);
  logger.info("startup", "Express server listening for connections", {listenPort: listenPort, mode: app.settings.env});
  // has to be printed on console for test to work
  /*eslint no-console: 0 */
  console.log('Express server listening for connections');
}

function setupMaster() {
  var cliParameterParsing = require('./bbr/common/cliParameterParsing');
  var optionSpec = {
    pgConnectionUrl: [false, 'URL som anvendes ved forbindelse til databasen', 'string'],
    listenPort: [false, 'TCP port der lyttes på', 'number', 3000],
    masterListenPort: [false, 'TCP port hvor master processen lytter (isalive)', 'number', 3001],
    disableClustering: [false, 'Deaktiver nodejs clustering, så der kun kører en proces', 'boolean'],
    pgPoolSize: [false, 'PostgreSQL connection pool størrelse', 'number', 25],
    pgPoolIdleTimeout: [false, 'Tidsrum en connection skal være idle før den lukkes (ms)', 'number', 10000],
    socketTimeout: [false, 'Socket timeout for TCP-forbindelser til APIet', 'number', 60000],
    maxWaitingClients: [false, 'Maximum number of clients to queue when there is no available db connections', 'number', 0],
    statementTimeout: [false, 'Maximum time before a database query is cancelled in milliseconds', 'number',10000 ],
    processes: [false, 'Number of concurrent worker processes', 'number']
  };

  cliParameterParsing.main(optionSpec, _.without(_.keys(optionSpec), 'disableClustering', 'processes'), function(args, options) {
    if(options.disableClustering) {
      _.extend(process.env, options);
      setupWorker();
      return;
    }

    var workerOptions = {
      pgConnectionUrl: options.pgConnectionUrl,
      listenPort: options.listenPort,
      logOptions: JSON.stringify(options.logOptions),
      socketTimeout: options.socketTimeout,
      pgPoolSize: options.pgPoolSize,
      pgPoolIdleTimeout: options.pgPoolIdleTimeout,
      maxWaitingClients: options.maxWaitingClients,
      statementTimeout: options.statementTimeout
    };
    const processCount = options.processes || require('os').cpus().length;

    for (var i = 0; i < processCount; i++) {
      spawn(workerOptions);
    }

    cluster.on('exit', function (worker, code, signal) {
      logger.error('master', 'Worker died. Restarting worker.', { pid: worker.process.pid, signal: signal, code: code});
      spawn(workerOptions);
    });

    var isaliveApp = express();
    isaliveApp.get('/isalive', function(req, res) {
      isalive.isaliveMaster(options).then(function(isalive) {
        res.json(isalive);
      }).catch(function(err) {
        logger.error('isalive', 'Unexpected error during isalive', err);
        res.status(500).send('Unexpected error during isalive: ' + util.inspect(err));
      });
    });

    isaliveApp.set('json spaces', 2);

    isaliveApp.listen(options.masterListenPort);
    logger.info("startup", "Master listening for isalive", {listenPort: options.masterListenPort});
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
  return worker;
}

process.on('uncaughtException', function(err) {
  console.log('UNCAUGHT EXCEPTION!');
  logger.error('uncaughtException', 'An uncaught exception occured, terminating process', err);
  process.exit(1);
});

