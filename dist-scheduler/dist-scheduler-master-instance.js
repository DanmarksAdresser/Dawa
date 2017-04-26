"use strict";

const config = require('../server/config');

const schedulerOpts = {
  slots: config.getOption('scheduler.slots'),
  prioritySlots: config.getOption('scheduler.prioritySlots'),
  slotsPerSource: config.getOption('scheduler.slotsPerSource'),
  cleanupInterval: config.getOption('scheduler.cleanupIntervalMillis'),
  initialPriorityOffset: config.getOption('scheduler.initialPriorityOffsetMillis'),
  requiredPriorityOffset: config.getOption('scheduler.requiredPriorityOffsetMillis'),
  timeout: config.getOption('scheduler.timeoutMillis')
};



const messagingInstance = require('../messaging/messaging-master-instance').instance;

const instance = require('./dist-scheduler-master').create(messagingInstance, schedulerOpts);

module.exports = {
  instance
};
