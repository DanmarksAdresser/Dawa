"use strict";

var express        = require("express");
var fs = require('fs');
var logger = require('./logger');
var statistics = require('./statistics');
var Q = require('q');
var _ = require('underscore');

var cluster = require('cluster');
var count = require('os').cpus().length;
var uuid = require('node-uuid');

var packageJson = JSON.parse(fs.readFileSync(__dirname + '/package.json'));

function asInteger(stringOrNumber) {
  return _.isNumber(stringOrNumber) ? stringOrNumber : parseInt(stringOrNumber);
}

function setupWorker() {
  var pg = require('pg.js');
  pg.defaults.poolSize = asInteger(process.env.pgPoolSize);
  pg.defaults.poolIdleTimeout = asInteger(process.env.pgPoolIdleTimeout);
  var dbapi = require('./dbapi');
  var dawaPgApi      = require('./dawaPgApi');
  var documentation = require('./documentation');
  require('./apiSpecification/allSpecs');

  process.on('message', function(message) {
    if(message.type === 'getStatus') {
      process.send({
        type: 'status',
        requestId: message.requestId,
        data: {
          status: 'up',
          postgresPool: dbapi.getPoolStatus(),
          statistics: statistics.getStatistics()
        }
      });
    }
  });

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
    masterListenPort: [false, 'TCP port hvor master processen lytter (isalive)', 'number', 3001],
    disableClustering: [false, 'Deaktiver nodejs clustering, så der kun kører en proces', 'boolean'],
    pgPoolSize: [false, 'PostgreSQL connection pool størrelse', 'number', 10],
    pgPoolIdleTimeout: [false, 'Tidsrum en connection skal være idle før den lukkes (ms)', 'number', 30000]
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
      spawn(workerOptions);
    });

    var isaliveApp = express();
    isaliveApp.get('/isalive', function(req, res) {
      var result = {
        name: packageJson.name,
        version: packageJson.version,
        generation_time: new Date().toISOString(),
        workers: []

      };
      var workerIds = Object.keys(cluster.workers);
      var statusPromises =
      _.map(workerIds, function(workerId) {
        var worker = cluster.workers[workerId];
        return getStatus(worker);
      });
      Q.allSettled(statusPromises).then(function(statuses) {
        for(var i = 0; i < workerIds.length; ++i) {
          var workerId = workerIds[i];
          var worker = cluster.workers[workerId];
          var status = statuses[i];
          result.workers.push({
            id: workerId,
            pid: worker.process.pid,
            isalive: status.state === 'fulfilled' ? status.value : {
              status: 'down',
              reason: 'Could not get status from worker process'
            }
          });
        }
        res.json(result);
      }).done();
    });
    isaliveApp.listen(3001);
    logger.info("startup", "Master listening for isalive", {listenPort: 3001});
  });
}

function getStatus(worker) {
  var deferred = Q.defer();
  var request = {
    type: 'getStatus',
    requestId: uuid.v4(),
    data: {}
  };
  function listener(response) {
    if (response.type === 'status' && response.requestId === request.requestId) {
      worker.removeListener('message', listener);
      deferred.resolve(response.data);
    }
  }
  worker.on('message', listener);
  worker.send(request);
  return Q.timeout(deferred.promise, 5000);
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