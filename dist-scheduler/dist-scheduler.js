"use strict";
const fairScheduler = require('./fair-scheduler');

const cluster = require('cluster');
const { go, Channel } = require('ts-csp');

const { channelIncomingMessages, getIncomingMessage } = require('./cluster-comm');

const { filter } = require('transducers-js');

const createScheduler = options => {
  const scheduler = fairScheduler(options);
  const enqueueChannel = new Channel(0, filter(msg =>
  {
    console.log('got message on master');
    console.dir(msg);
    return msg['@@MESSAGE_TYPE'] === 'DIST_SCHEDULER_ENQUEUE';
  }));
  channelIncomingMessages(enqueueChannel);
  const process = go(function*() {
    /* eslint no-constant-condition: 0 */
    while(true) {
      const { taskId, clientId, workerId } = yield this.takeOrAbort(enqueueChannel);
      const taskFn = () => go(function*() {
        const before = Date.now();
        const worker = cluster.workers[workerId];
        const completeProcess = getIncomingMessage(worker,
          msg => (msg['@@MESSAGE_TYPE'] === 'DIST_SCHEDULER_COMPLETE' &&
          msg.taskId === taskId));
        worker.send({
          taskId,
          clientId,
          '@@MESSAGE_TYPE': 'DIST_SCHEDULER_READY'
        });
        yield completeProcess;
        return {
          cost: Date.now() - before,
          result: null
        };
      });
      scheduler.schedule(clientId, taskFn);
    }
  });
  process.completed.take().then(result => {
    console.dir(result);
  });
  return { process, scheduler };
};

module.exports = {
  createScheduler
};
