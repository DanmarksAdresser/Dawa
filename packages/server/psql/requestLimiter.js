const distSchedulerClientCreate = require('../dist-scheduler/dist-scheduler-client').create;
const messagingInstance = require('../messaging/messaging-worker-instance').instance;

const CONNECTION_SCHEDULER_ENABLED = true;
const QUERY_SCHEDULER_ENABLED = true;
const QUERY_SCHEDULER_OPTIONS = {
  timeout: 10000
};
const CONNECTION_SCHEDULER_OPTIONS = {
  timeout: 5000
};

class QuerySlotTimeout extends Error {
  constructor() {
    super('Timeout waiting for query slot');
  }
}

class ConnectionSlotTimeout extends Error {
  constructor() {
    super('Timeout waiting for connection slot');
  }
}

let databaseQueryLimiter = (clientId, fn) => fn();
databaseQueryLimiter.status = () => "Query limiting disabled";
if(QUERY_SCHEDULER_ENABLED) {
  const scheduler = distSchedulerClientCreate(messagingInstance, 'DIST_SCHEDULER', QuerySlotTimeout, QUERY_SCHEDULER_OPTIONS);

  databaseQueryLimiter = (clientIp, fn, timeout) =>  scheduler.schedule(clientIp, fn, timeout);
  databaseQueryLimiter.status = () => scheduler.status();
}

let databaseConnectionLimiter = (clientId, fn) => fn();
databaseConnectionLimiter.status = () => "Connection limiting disabled";
if(CONNECTION_SCHEDULER_ENABLED){
  const scheduler = distSchedulerClientCreate(messagingInstance, 'CONNECTION_SCHEDULER', ConnectionSlotTimeout, CONNECTION_SCHEDULER_OPTIONS);

  databaseConnectionLimiter = (clientIp, fn, timeout) => scheduler.schedule(clientIp, fn, timeout);
  databaseConnectionLimiter.status = () => scheduler.status();
}
module.exports = {
  QuerySlotTimeout,
  ConnectionSlotTimeout,
  databaseQueryLimiter,
  databaseConnectionLimiter
};
