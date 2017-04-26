"use strict";

const cluster = require('cluster');
const express = require("express");
const path = require('path');
const fs = require('fs');
const util = require('util');

const logger = require('../logger');
const cliParameterParsing = require('../bbr/common/cliParameterParsing');
const config = require('./config');
const _ = require('underscore');

function spawn(options){
  var worker = cluster.fork(options);
  return worker;
}

const options = JSON.parse(fs.readFileSync(path.join(__dirname, '../config-defaults.json'), {encoding: 'utf-8'}));
const cliSpec = options.reduce((memo, option) => {
  const defaultValue = option.default === 'undefined' ?
    [] :
    option.type === 'boolean' && option.default === false ?
      [] :
      [option.default];
  memo[option.name] = [false, option.description, option.type,
    ... defaultValue];
  return memo;
}, {});

  cliParameterParsing.main(cliSpec, _.without(Object.keys(cliSpec), 'ois.enabled'), function(args, options) {
    config.setOptions(options);
    if(config.getOption('ois.enabled') && !config.getOption('ois.unprotected') && config.getOption('ois.password') === 'ois') {
      throw new Error('OIS enabled but with default password. That is not OK.');
    }

    const isalive = require('../isalive/isalive');

    const optionKeys = Object.keys(options);
    const workerOptions = optionKeys.reduce((memo, key) => {
      memo[key] = options[key];
      return memo;
    }, {});
    workerOptions.logOptions = JSON.stringify(options.logOptions);

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
