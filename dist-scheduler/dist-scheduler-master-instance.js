"use strict";

const config = require('../server/config');

const querySchedulerOpts = {
  slots: config.getOption('scheduler.slots'),
  prioritySlots: config.getOption('scheduler.prioritySlots'),
  slotsPerSource: config.getOption('scheduler.slotsPerSource'),
  cleanupInterval: config.getOption('scheduler.cleanupIntervalMillis'),
  initialPriorityOffset: config.getOption('scheduler.initialPriorityOffsetMillis'),
  requiredPriorityOffset: config.getOption('scheduler.requiredPriorityOffsetMillis'),
  timeout: config.getOption('scheduler.timeoutMillis')
};

const connectionSchedulerOpts = {
  slots: 150,
  slotsPerSource: 10,
  timeout: 1000 * 60 * 60
};


const messagingInstance = require('../messaging/messaging-master-instance').instance;

const { QueryScheduler } = require('./queryScheduler');
const { ConnectionScheduler } = require('./connectionScheduler');
const { DistScheduler } = require('./dist-scheduler-master');

const queryScheduler = new DistScheduler(new QueryScheduler(querySchedulerOpts), messagingInstance, 'DIST_SCHEDULER', querySchedulerOpts);
const connectionScheduler = new DistScheduler(new ConnectionScheduler(connectionSchedulerOpts), messagingInstance, 'CONNECTION_SCHEDULER', connectionSchedulerOpts);
module.exports = {
  queryScheduler,
  connectionScheduler
};
