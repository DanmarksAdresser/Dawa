"use strict";

const config = require('@dawadk/common/src/config/holder').getConfig();

const querySchedulerOpts = {
  slots: config.get('query_scheduler.slots'),
  prioritySlots: config.get('query_scheduler.priority_slots'),
  slotsPerSource: config.get('query_scheduler.slots_per_source'),
  cleanupInterval: config.get('query_scheduler.cleanup_interval_millis'),
  initialPriorityOffset: config.get('query_scheduler.initial_priority_offset_millis'),
  requiredPriorityOffset: config.get('query_scheduler.required_priority_offset_millis'),
  timeout: config.get('query_scheduler.timeout_millis')
};


const connectionSchedulerOpts = {
  slots: config.get('connection_scheduler.slots'),
  slotsPerSource: config.get('connection_scheduler.slots_per_source'),
  timeout: config.get('connection_scheduler.timeout'),
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
