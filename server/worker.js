"use strict";

const logger = require('../logger');
logger.initialize(JSON.parse(process.env.logOptions));

const fs = require('fs');
const path = require('path');
const express = require('express');
const compression = require('compression');
const http = require('http');
const config = require('./config');

const optionSpec = JSON.parse(fs.readFileSync(path.join(__dirname, '../config-defaults.json'), { encoding: 'utf-8'}));

const options = optionSpec.reduce((memo, option) => {
  const strValue = process.env[option.name];
  const value = option.type === 'number' ? parseInt(strValue, 10) : strValue;
  memo[option.name] = value;
  return memo;
}, {});

config.setOptions(options);

const errorMessages = require('../haproxy/errorMessages');
const proddb = require('../psql/proddb');
const { requestLimiter } = require('../psql/requestLimiter');
const databasePools = require('../psql/databasePools');

const dawaPgApi      = require('../dawaPgApi');
const documentation = require('../documentation');
require('../apiSpecification/allSpecs');
const isalive = require('../isalive/isalive-worker')

const dboptions = {
  max: options['pg.pool.max'],
  idleTimeoutMillis: config.getOption('pg.pool.idleTimeoutMillis'),
  maxWaitingClients: config.getOption('pg.pool.maxWaitingClients'),
  acquireTimeoutMillis: config.getOption('pg.pool.acquireTimeoutMillis'),
  statementTimeoutMillis: config.getOption('pg.statementTimeoutMillis'),
  connString: config.getOption('pgConnectionUrl'),
  pooled: true,
  requestLimiter
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


app.use(socketTimeoutMiddleware(config.getOption('socketTimeoutMillis')));

// Hackish: We reduce memlevel to prevent zLib from caching too much internally
// Otherwise, it will take too long for our application to start responding to JSON requests,
// potentially resulting in a TCP disconnection.
app.use(compression( {
  memLevel: 3
}));
app.use(express.static(path.join(__dirname, '../public'), {maxAge: 10000}));


const listenPort = config.getOption('listenPort');

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

// has to be printed on console for test to work
/*eslint no-console: 0 */
console.log('Express server listening for connections');
