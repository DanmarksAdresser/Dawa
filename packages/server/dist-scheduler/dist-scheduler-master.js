"use strict";

const assert = require('assert');
const {go, Channel, OperationType} = require('ts-csp');
const logger = require('@dawadk/common/src/logger').forCategory('distScheduler');

const DEFAULT_TIMEOUT = 12000;

const runDistScheduler = (distScheduler) => go(function*() {
  try {
    distScheduler.messagingInstance.subscribe(`${distScheduler.messageTypePrefix}_ENQUEUE`, distScheduler.enqueueChannel);
    while (true) {
      const { ch, value } = yield this.selectOrAbort([
        { ch: distScheduler.enqueueChannel, op: OperationType.TAKE },
        { ch: distScheduler.completeChannel, op: OperationType.TAKE },
        { ch: distScheduler.timeoutChannel, op: OperationType.TAKE }
      ]);
      if(ch === distScheduler.enqueueChannel) {
        const {payload: {clientId, taskId}, workerId} = value;
        if(!distScheduler.scheduler.exceedsQueueLimit(clientId)) {
          distScheduler.taskMap[taskId] = {clientId, workerId};
          distScheduler.scheduler.scheduleTask(clientId, taskId);
          const receivePromise = distScheduler.messagingInstance.receiveOnce(
            `${distScheduler.messageTypePrefix}_COMPLETE`,
            workerId,
            msg => msg.taskId === taskId, distScheduler.timeout);
          go(function*(){
            try {
              yield receivePromise;
              distScheduler.completeChannel.putSync(taskId);
            }
            catch(err) {
              logger.error('Did not receive response from worker for task ' + taskId, err);
              distScheduler.timeoutChannel.putSync(taskId);
            }
          });
        }
        else {
          distScheduler.messagingInstance.send(`${distScheduler.messageTypePrefix}_REJECT`, workerId, {taskId, clientId});
        }
      }
      else if (ch === distScheduler.completeChannel) {
        const taskId = value;
        delete distScheduler.taskMap[taskId];
        distScheduler.scheduler.completeTask(taskId, Date.now());
        assert(!distScheduler.scheduler.containsTask(taskId));
      }
      else {
        const taskId = value;
        delete distScheduler.taskMap[taskId];
        distScheduler.scheduler.completeTask(taskId, Date.now());
        assert(!distScheduler.scheduler.containsTask(taskId));
      }
      while(distScheduler.scheduler.canRunTask()) {
        const taskId = distScheduler.scheduler.runTask(Date.now());
        assert(distScheduler.scheduler.containsTask(taskId));
        const {clientId, workerId} = distScheduler.taskMap[taskId];
        distScheduler.messagingInstance.send(`${distScheduler.messageTypePrefix}_READY`, workerId, {taskId, clientId});
      }
    }
  }
  catch(e) {
    logger.error(e);
  }
});

class DistScheduler {
  constructor(scheduler, messagingInstance, messageTypePrefix, options) {
    this.scheduler = scheduler;
    this.messagingInstance = messagingInstance;
    this.messageTypePrefix = messageTypePrefix;
    this.timeout = options.timeout || DEFAULT_TIMEOUT;

    // Channel receiving enqueues
    this.enqueueChannel = new Channel();
    // Channel receiving task IDs on completed tasks
    this.completeChannel = new Channel();
    // Channel receiving task IDs of timeouted tasks
    this.timeoutChannel = new Channel();
    // map from taskId to {workerId,clientId}
    this.taskMap = {};

    this.process =runDistScheduler(this);
  }
  status() {
    return {
      queueStatus: this.scheduler.status(),
      timeout: this.timeout
    }
  }
}
module.exports = {
  DistScheduler
};
