"use strict";

const {go, Signal, Channel } = require('ts-csp');
const uuid = require('node-uuid');

const { takeWithTimeout } = require('../util/cspUtil');
const logger = require('../logger').forCategory('distSchedulerClient');

const create = (messagingInstance, options) => {
  options = options || {};
  const timeout = options.timeout || 15000;
  const tasks = {};
  const readyChannel = new Channel();
  messagingInstance.subscribe('DIST_SCHEDULER_READY', readyChannel);

  const process = go(function*() {
    /* eslint no-constant-condition: 0 */
    while (true) {
      const message = yield this.takeOrAbort(readyChannel);
      const taskId = message.taskId;
      const taskDescriptor = tasks[taskId];
      if (!taskDescriptor) {
        logger.error(
          'Unexpected: Received READY message for task ' + taskId + ' but task does not exist');
        continue;
      }
      delete tasks[taskId];
      go(function*() {
        try {
          taskDescriptor.readySignal.raise();
          yield taskDescriptor.process;

        }
          /* eslint no-empty: 0 */
        catch (err) {
          // We are not responsible for handling/logging this
        }
        finally {
          messagingInstance.send('DIST_SCHEDULER_COMPLETE', {
            taskId,
            clientId: taskDescriptor.clientId
          });
        }
      });
    }
  });
  const schedule = (clientId, taskFn) =>  {
    const taskId = uuid.v4();
    const readySignal = new Signal();

    messagingInstance.send('DIST_SCHEDULER_ENQUEUE', {
      taskId,
      clientId
    });

    const process = go(function*() {
      yield takeWithTimeout(
        timeout,
        readySignal,
        () => new Error('Timeout waiting for query slot'));
      return yield this.delegateAbort(taskFn());
    });

    tasks[taskId] = {
      process,
      readySignal,
      clientId
    };

    return process;
  };

  return {
    schedule,
    process
  };

};

module.exports = {
  create
};
