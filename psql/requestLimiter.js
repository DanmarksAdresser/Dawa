const distSchedulerClientCreate = require('../dist-scheduler/dist-scheduler-client').create;
const messagingInstance = require('../messaging/messaging-worker-instance').instance;
const { go } = require('ts-csp');

const FAIR_SCHEDULER_ENABLED = true;
const SCHEDULER_OPTIONS = {
  timeout: 12000
};

let requestLimiter = (clientId, fn) => fn();
requestLimiter.status = () => "Request limiting disabled";
if(FAIR_SCHEDULER_ENABLED) {
  const scheduler = distSchedulerClientCreate(messagingInstance, SCHEDULER_OPTIONS);

  requestLimiter = (clientIp, fn) => go(function*() {
    const scheduleResult = yield scheduler.schedule(clientIp, () => go(function*() {
      const before = Date.now();

      let result;
      try {
        result = {succeeded: yield fn() }
      }
      catch(err) {
        result = { failed: err}
      }
      const duration = Date.now() - before;
      return {
        cost: duration,
        result: result
      }
    }));
    const result = scheduleResult.result;
    if(typeof result.succeeded !== 'undefined') {
      return result.succeeded;
    }
    else {
      throw result.failed;
    }
  });
  requestLimiter.status = () => scheduler.status();
}

module.exports = {
  requestLimiter
};
