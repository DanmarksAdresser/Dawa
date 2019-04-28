"use strict";

const logger = require('@dawadk/common/src/logger');
const path = require('path');
const express = require('express');
const compression = require('compression');
const http = require('http');
const configHolder = require('@dawadk/common/src/config/holder');
const configSchema = configHolder.mergeConfigSchemas([
  require('../config/server-schema'),
  require('@dawadk/common/src/config/base-schema')
]);
process.once('message', msg => {
  configHolder.initialize(configSchema, [], JSON.parse(msg));
  logger.initialize(configHolder.getConfig().get('logging'));
  const config = configHolder.getConfig();
  const errorMessages = require('../haproxy/errorMessages');
  const proddb = require('../psql/proddb');
  const { databaseQueryLimiter, databaseConnectionLimiter } = require('../psql/requestLimiter');
  const databasePools = require('@dawadk/common/src/postgres/database-pools');

  const dawaPgApi      = require('../dawaPgApi');
  const documentation = require('../documentation');
  require('../apiSpecification/allSpecs');
  const isalive = require('../isalive/isalive-worker')

  const dboptions = {
    max: config.get('pg.pool.max'),
    idleTimeoutMillis: config.get('pg.pool.idle_timeout_millis'),
    maxWaitingClients: config.get('pg.pool.max_waiting_clients'),
    acquireTimeoutMillis: config.get('pg.pool.acquire_timeout_millis'),
    statementTimeoutMillis: config.get('pg.pool.statement_timeout_millis'),
    connString: config.get('database_url'),
    pooled: true,
    databaseQueryLimiter,
    databaseConnectionLimiter
  };
  proddb.init(dboptions);
  databasePools.create('prod', dboptions);

  const app = express();

  function socketTimeoutMiddleware(timeoutMillis) {
    return function(req, res, next) {
      res.socket.setTimeout(timeoutMillis);
      res.socket.setKeepAlive(true, 1000);
      next();
    };
  }


  app.use(socketTimeoutMiddleware(config.get('socket_timeout_millis')));

// Hackish: We reduce memlevel to prevent zLib from caching too much internally
// Otherwise, it will take too long for our application to start responding to JSON requests,
// potentially resulting in a TCP disconnection.
  app.use(compression( {
    memLevel: 3
  }));
  app.use(express.static(path.join(__dirname, '../dist'), {maxAge: 10000}));


  const listenPort = config.get('port');

  app.use('', dawaPgApi.setupRoutes());
  app.use('', documentation);

  app.get('/error/:error', function(req, res) {
    const error = req.params.error;
    if(Object.keys(errorMessages).includes(error)) {
      res.status(errorMessages[error].status);
      res.set('Content-Type', 'application/json');
      res.send(errorMessages[error].content);
    }
    else {
      res.sendStatus(404);
    }
  });

  const server = http.createServer(app);
  isalive.setup(server);
  server.listen(listenPort);
  logger.info("startup", "Express server listening for connections", {listenPort: listenPort, mode: app.settings.env});
});