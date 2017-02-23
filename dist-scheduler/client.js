"use strict";

const { go } = require('ts-csp');
const process = require('process');
const uuid = require('node-uuid');

const { getIncomingMessage } = require('./cluster-comm');
const schedule = (clientId, taskFn) => go(function*() {
  const taskId = uuid.v4();
  console.log('sending to parent');
  process.send({
    '@@MESSAGE_TYPE': 'DIST_SCHEDULER_ENQUEUE',
    taskId,
    clientId
  });
  const response = yield getIncomingMessage(process, msg => msg.taskId === taskId);
  if(response['@@MESSAGE_TYPE'] === 'DIST_SCHEDULER_READY') {
    console.log('SCHEDULER READY MESSAGE RECEIVED');
    try {
      return yield this.delegateAbort(taskFn());
    }
    catch(e) {
      console.error(e);
      throw e;
    }
    finally {
      console.log('TASK COMPLETE, SENDING COMPLETE MESSAGE');
      process.send({
        '@@MESSAGE_TYPE': 'DIST_SCHEDULER_COMPLETE',
        taskId,
        clientId
      });
    }
  }
});

module.exports = {
  schedule
};
