"use strict";

const logger = require('@dawadk/common/src/logger');
const path = require('path');
const express = require('express');
const compression = require('compression');
const http = require('http');
const configHolder = require('@dawadk/common/src/config/holder');
const configSchema = configHolder.mergeConfigSchemas([
  require('../conf/schemas/server-schema'),
  require('@dawadk/common/src/config/base-schema')
]);

const setupApi = (app) => {
  const config = configHolder.getConfig();
  const proddb = require('../psql/proddb');
  const { databaseQueryLimiter, databaseConnectionLimiter } = require('../psql/requestLimiter');
  const databasePools = require('@dawadk/common/src/postgres/database-pools');

  const dawaPgApi      = require('../dawaPgApi');

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
  app.use('', dawaPgApi.setupRoutes());

}

const setupDocumentation = (app) => {
  const documentation = require('../documentation');
  app.use('', documentation);
}

process.once('message', msg => {
  configHolder.initialize(configSchema, [], JSON.parse(msg));
  logger.initialize(configHolder.getConfig().get('logging'));
  const config = configHolder.getConfig();
  require('../apiSpecification/allSpecs');
  const isalive = require('../isalive/isalive-worker')

  const app = express();

  function socketKeepaliveMiddleware() {
    return function(req, res, next) {
      // WORKAROUND: For unclear reasons, socket may be null.
      if(res.socket) {
        res.socket.setKeepAlive(true, 1000);
      }
      next();
    };
  }


  app.use(socketKeepaliveMiddleware());

// Hackish: We reduce memlevel to prevent zLib from caching too much internally
// Otherwise, it will take too long for our application to start responding to JSON requests,
// potentially resulting in a TCP disconnection.
  app.use(compression( {
    memLevel: 3
  }));
  app.use(express.static(path.join(__dirname, '../dist'), {maxAge: 10000}));


  const listenPort = config.get('port');


  const errorMessages = require('../haproxy/errorMessages');
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

  if(!config.get('docs_only')) {
    setupApi(app);
  }
  if(!config.get('api_only')) {
    setupDocumentation(app);
  }
  const server = http.createServer(app);
  server.setTimeout(config.get('socket_timeout_millis'));
  isalive.setup(server);
  server.listen(listenPort);
  logger.info("startup", "Express server listening for connections", {listenPort: listenPort, mode: app.settings.env});
});
