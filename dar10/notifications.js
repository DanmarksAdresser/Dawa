"use strict";

const express = require('express');
const bodyParser = require('body-parser');
const _ = require('underscore');

const cliParameterParsing = require('../bbr/common/cliParameterParsing');
const logger = require('../logger').forCategory("notifications");

const optionSpec = {
  listenPort: [false, 'TCP port der lyttes på', 'number', 3000]
};

const  notifications = [];

cliParameterParsing.main(optionSpec, _.keys(optionSpec), function(args, options) {
  const app = express();
  app.use(bodyParser.json());
  app.get('/notifications', function(req, res) {
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(notifications, null, 2));
  });

  app.get('/health', function(req, res) {
    res.end("OK");
  });
  
  app.post('/notify', function(req, res) {
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
  });

  app.listen(options.listenPort, function () {
    logger.info(`Notification service listening on port ${options.listenPort}`);
  });
});
