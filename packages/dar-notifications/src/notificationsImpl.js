"use strict";

const express = require('express');
const bodyParser = require('body-parser');
const http = require('http');
var expressWs = require('express-ws');
const _ = require('underscore');

const logger = require('@dawadk/common/src/logger').forCategory("notifications");

const wsHeartbeats = require('ws-heartbeats');


const notificationMap = {};
const wsClientsMap = {};

const DEFAULT_ENV = 'pp';

exports.createNotificationApp = (options) => {

  const handleQuery = (env, req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(notificationMap[env] || [], null, 2));
  };

  const handleNotification = (env, req, res) => {
    if(notificationMap[env] === undefined) {
      notificationMap[env] = [];
    }
    const notifications = notificationMap[env];
    if(req.header('Content-Type') !== 'application/json') {
      logger.info("Rejected request with invalid content type", {
        contentType: req.header('Content-Type')
      });
      res.status(400).end("Content type of request must be application/json");
      return;
    }
    notifications.push(req.body);
    if(notifications.length > 100) {
      notifications.unshift();
    }
    logger.info("Received notification", {
      notification: req.body
    });
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({}, null, 2));
    for(let wsClient of wsClientsMap[env] || []) {
      try {
        wsClient.send(JSON.stringify(req.body));
      }
      catch(e) {
        logger.error('Got error when sending response to ws client', e);
      }
    }
  };

  const app = express();
  const server = http.createServer(app);
  expressWs(app, server);
  app.use(bodyParser.json());

  app.get('/notifications', (req, res) => handleQuery(DEFAULT_ENV, req, res));

  app.get('/:env/notifications', (req, res) => handleQuery( req.params.env, req, res));

  app.get('/health', function(req, res) {
    res.json({
      status: 'up',
      clients: _.mapObject(wsClientsMap, wsClients => wsClients.length)
    });
  });

  app.post('//notify', (req, res) => handleNotification(DEFAULT_ENV, req, res));

  app.post('/:env/notify', (req, res) => handleNotification(req.params.env, req, res));

  app.ws('/:env/listen', (ws, req) => {

    const env = req.params.env;
    if(wsClientsMap[env] === undefined) {
      wsClientsMap[env] = [];
    }
    const wsClients = wsClientsMap[env];
    wsClients.push(ws);
    logger.info('Received ws connection', { env: env, listeners: wsClients.length});
    wsHeartbeats(ws, {
      heartbeatTimeout: 30000,
      heartbeatInterval: 15000
    });
    ws.on('close', function close() {
      wsClientsMap[env] = wsClientsMap[env].filter(wsClient => wsClient !== ws);
    });
  });

  return server;
};
