const Promise = require('bluebird');
const fairScheduler = require('../dist-scheduler/fair-scheduler');
const { schedule } = require('../dist-scheduler/client');
const { go } = require('ts-csp');

const FAIR_SCHEDULER_ENABLED = true;

let requestLimiter = (clientId, fn) => fn();
requestLimiter.status = () => "Request limiting disabled";
if(FAIR_SCHEDULER_ENABLED) {
  const scheduler = fairScheduler({
    concurrency: 2,
    cleanupInterval: 5000,
    initialPriorityOffset: -2000,
    prioritySlots: 1
  });

  requestLimiter = (clientIp, fn) => go(function*() {
    const scheduleResult = yield schedule(clientIp, () => go(function*() {
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
