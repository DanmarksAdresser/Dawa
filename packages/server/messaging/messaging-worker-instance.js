"use strict";

const messagingWorker = require('./messaging-worker');
const process = require('process');

module.exports = {
  instance: messagingWorker.setup(process)
};
