"use strict";

var express        = require("express");
var compression = require('compression');
var http = require('http');
var fs = require('fs');
var logger = require('./logger');
var statistics = require('./statistics');
var q = require('q');
var _ = require('underscore');

var cluster = require('cluster');
var database = require('./psql/database');
var count = require('os').cpus().length;
var uuid = require('node-uuid');
var pg = require('pg.js');
require('pg-parse-float')(pg);

var packageJson = JSON.parse(fs.readFileSync(__dirname + '/package.json'));

/**
 * We log memory statistics, so we can monitor memory consumption in splunk.
 * This does not work on windows.
 */
if(process.platform !== 'win32') {
  var memwatch = require('memwatch-next');
  memwatch.on('stats', function(stats) {
    var logMeta = {
      pid: process.pid,
      current_base: stats.current_base,
      estimated_base: stats.estimated_base,
      min: stats.min,
      max: stats.max,
      usage_trend: stats.usage_trend
    };
    logger.info('memory', 'stats', logMeta);
    if(stats.current_base > 768 * 1024 * 1024) {
      logger.error('memory','Memory limit exceeded. Exiting process.', logMeta);
      process.exit(1);
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
  var proddb = require('./psql/proddb');
  var poolLogger = logger.forCategory('dbPool');
  var dboptions = {
    poolSize: asInteger(process.env.pgPoolSize),
    poolIdleTimeout: asInteger(process.env.pgPoolIdleTimeout),
    maxWaitingClients: process.env.maxWaitingClients,
    connString: process.env.pgConnectionUrl,
    pooled: true,
    poolLog: function (msg, level) {
      if (level === 'info' || level === 'warn' || level === 'error') {
        poolLogger.log(level, msg);
      }
    }
  };
  proddb.init(dboptions);
  var dawaPgApi      = require('./dawaPgApi');
  var documentation = require('./documentation');
  require('./apiSpecification/allSpecs');

  process.on('message', function(message) {
    if(message.type === 'getStatus') {
      return q.ninvoke(server, 'getConnections').then(function(count) {
        return proddb.withTransaction('READ_ONLY', function(client) {
          return client.queryp('select * from adgangsadresser limit 1').then(function(result) {
            process.send({
              type: 'status',
              requestId: message.requestId,
              data: {
                status: result.rows && result.rows.length === 1 ? 'up' : 'down',
                postgresPool: database.getPoolStatus('prod'),
                statistics: statistics.getStatistics(),
                connections: count
              }
            });
          }, function(err) {
            process.send({
              type: 'status',
              requestId: message.requestId,
              data: {
                status: 'down',
                postgresError: err,
                postgresPool: database.getPoolStatus('prod'),
                statistics: statistics.getStatistics(),
                connections: count
              }
            });
          });
        });
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


  var server = http.createServer(app);
  server.listen(listenPort);
  logger.info("startup", "Express server listening for connections", {listenPort: listenPort, mode: app.settings.env});
  console.log('Express server listening for connections on port ' + listenPort);
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
    maxWaitingClients: [false, 'Maximum number of clients to queue when there is no available db connections', 'number', 0]
  };

  cliParameterParsing.main(optionSpec, _.without(_.keys(optionSpec), 'disableClustering'), function(args, options) {
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
      maxWaitingClients: options.maxWaitingClients
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
      q.allSettled(statusPromises).then(function(statuses) {
        for(var i = 0; i < workerIds.length; ++i) {
          var workerId = workerIds[i];
          var worker = cluster.workers[workerId];
          var status = statuses[i];
          result.workers.push({
            id: workerId,
            pid: worker ? worker.process.pid : null,
            isalive: status.state === 'fulfilled' ? status.value : {
              status: 'down',
              reason: 'Could not get status from worker process'
            }
          });
        }
        res.json(result);
      }).done();
    });

    isaliveApp.set('json spaces', 2);

    isaliveApp.listen(options.masterListenPort);
    logger.info("startup", "Master listening for isalive", {listenPort: options.masterListenPort});
  });
}

function getStatus(worker) {
  var deferred = q.defer();
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
  return q.timeout(deferred.promise, 5000);
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
  logger.error('uncaughtException', 'An uncaught exception occured, terminating process', err);
  process.exit(1);
});

