"use strict";

const cluster = require('cluster');
const express = require("express");
const util = require('util');

const logger = require('@dawadk/common/src/logger');
const runConfigured = require('@dawadk/common/src/cli/run-configured');

const configSchema = require('../conf/schemas/server-schema');

function spawn(config){
  var worker = cluster.fork();
  worker.send(JSON.stringify(config));
  return worker;
}

runConfigured(configSchema, [], conf => {
  const isalive = require('../isalive/isalive');


  const processCount = conf.get('processes') || require('os').cpus().length;

  for (var i = 0; i < processCount; i++) {
    spawn(conf.get(''));
  }


  cluster.on('exit', function (worker, code, signal) {
    logger.error('master', 'Worker died. Restarting worker.', { pid: worker.process.pid, signal: signal, code: code});
    spawn(conf.get(''));
  });

  var isaliveApp = express();
  isaliveApp.get('/isalive', function(req, res) {
    isalive.isaliveMaster().then(function(isalive) {
      if(isalive.status !== 'up') {
        res.status(500).json(isalive);
      }
      else {
        res.json(isalive);
      }
    }).catch(function(err) {
      logger.error('isalive', 'Unexpected error during isalive', err);
      res.status(500).send('Unexpected error during isalive: ' + util.inspect(err));
    });
  });

  isaliveApp.set('json spaces', 2);

  const masterPort = conf.get('master_port');
  isaliveApp.listen(masterPort, () => {
    if(process.send) {
      process.send({msg: 'server ready'});
    }
  });
  logger.info("startup", "Master listening for isalive", {listenPort: masterPort});
});