const distSchedulerClientCreate = require('../dist-scheduler/dist-scheduler-client').create;
const messagingInstance = require('../messaging/messaging-worker-instance').instance;

const FAIR_SCHEDULER_ENABLED = true;
const SCHEDULER_OPTIONS = {
  timeout: 12000
};

let requestLimiter = (clientId, fn) => fn();
requestLimiter.status = () => "Request limiting disabled";
if(FAIR_SCHEDULER_ENABLED) {
  const scheduler = distSchedulerClientCreate(messagingInstance, SCHEDULER_OPTIONS);

  requestLimiter = (clientIp, fn) => scheduler.schedule(clientIp, fn);
  requestLimiter.status = () => scheduler.status();
}

module.exports = {
  requestLimiter
};
