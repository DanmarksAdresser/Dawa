"use strict";

const {go, Signal, Channel, OperationType } = require('ts-csp');
const uuid = require('uuid');

const { takeWithTimeout } = require('../util/cspUtil');
const logger = require('../logger').forCategory('distSchedulerClient');


const create = (messagingInstance, messageTypePrefix, TimeoutErrorClass, options) => {
  options = options || {};
  const timeout = options.timeout || 15000;
  const tasks = {};
  const readyChannel = new Channel();
  messagingInstance.subscribe(`${messageTypePrefix}_READY`, readyChannel);
  const rejectChannel = new Channel();
  messagingInstance.subscribe(`${messageTypePrefix}_REJECT`, rejectChannel);
  const status = () => 'not implemented yet';

  const process = go(function*() {
    /* eslint no-constant-condition: 0 */
    while (true) {
      const { ch, value } = yield this.selectOrAbort([
        { ch: readyChannel, op: OperationType.TAKE },
        { ch: rejectChannel, op: OperationType.TAKE }
      ]);
      const message = value;
      const taskId = message.taskId;
      const taskDescriptor = tasks[taskId];
      if (!taskDescriptor) {
        logger.error(
          'Unexpected: Received READY|REJECT message for task ' + taskId + ' but task does not exist');
        messagingInstance.send(`${messageTypePrefix}_COMPLETE`, {
          taskId
        });
        continue;
      }
      delete tasks[taskId];
      if(ch === rejectChannel) {
        taskDescriptor.signal.raise("REJECT");
      }
      else {
        go(function* () {
          try {
              taskDescriptor.signal.raise("READY");
            yield taskDescriptor.process;

          }
            /* eslint no-empty: 0 */
          catch (err) {
            // We are not responsible for handling/logging this
          }
          finally {
            messagingInstance.send(`${messageTypePrefix}_COMPLETE`, {
              taskId,
              clientId: taskDescriptor.clientId
            });
          }
        });
      }
    }
  });

  const schedule = (clientId, taskFn, overriddenTimeout) =>  {
    if(!clientId) {
      return taskFn();
    }
    let chosenTimeout = overriddenTimeout || timeout;
    const taskId = uuid.v4();
    const signal = new Signal();

    messagingInstance.send(`${messageTypePrefix}_ENQUEUE`, {
      taskId,
      clientId
    });

    const process = go(function*() {
      const received = yield takeWithTimeout(
        chosenTimeout,
        signal,
        () => new TimeoutErrorClass());
      if(received === 'READY') {
        return yield this.delegateAbort(taskFn());
      }
      else {
        throw new TimeoutErrorClass();
      }
    });

    tasks[taskId] = {
      process,
      signal,
      clientId
    };

    return process;
  };

  return {
    schedule,
    process,
    status
  };

};

module.exports = {
  create
};
