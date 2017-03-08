"use strict";
const fairScheduler = require('./fair-scheduler');

const {go, Channel} = require('ts-csp');
const logger = require('../logger').forCategory('distScheduler');

const DEFAULT_TIMEOUT = 12000;

const create = (messagingInstance, options) => {
  const timeout = options.timeout || DEFAULT_TIMEOUT;
  const scheduler = fairScheduler(options);
  const enqueueChannel = new Channel();
  const status = () => (
    {
      scheduler: scheduler.status(),
      options: {
        messagingTimeout: timeout
      }
    });
  messagingInstance.subscribe('DIST_SCHEDULER_ENQUEUE', enqueueChannel);
  const process = go(function*() {
    /* eslint no-constant-condition: 0 */
    while (true) {
      const {payload: {clientId, taskId}, workerId} = yield this.takeOrAbort(enqueueChannel);
      const taskFn = () => go(function*() {
        const before = Date.now();
        if(!messagingInstance.workerExists(workerId)) {
          logger.error('Could not schedule task: Worker is gone');
          return {
            cost: 0,
            result: null
          };
        }
        messagingInstance.send('DIST_SCHEDULER_READY', workerId, {taskId, clientId});
        try {
          yield messagingInstance.receiveOnce(
            'DIST_SCHEDULER_COMPLETE',
            workerId,
            msg => msg.taskId === taskId, timeout);
          return {
            cost: Date.now() - before,
            result: null
          };
        }
        catch (err) {
          logger.error('Did not receive response from worker', err);
          return {
            cost: Date.now() - before,
            result: null
          };
        }
      });
      scheduler.schedule(clientId, taskFn);
    }
  });
  return {process, scheduler, status};
};

module.exports = {
  create
};
