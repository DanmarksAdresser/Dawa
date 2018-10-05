"use strict";

const {Channel, Signal, go} = require('ts-csp');

const {takeWithTimeout} = require('../util/cspUtil');

const logger = require('../logger').forCategory('messaging-master');

const setup = (cluster) => {
  const ch = new Channel();

  const addedWorkerIds = [];
  const addWorker = worker => {
    if (addedWorkerIds.includes(worker.id)) {
      return;
    }
    addedWorkerIds.push(worker.id);
    worker.on('message', (msg) => {
      if (!msg['@@MESSAGE_TYPE']) {
        return;
      }
      ch.putSync(Object.assign({}, msg, {workerId: worker.id}));
    });
  };
  for (let workerId of Object.keys(cluster.workers)) {
    const worker = cluster.workers[workerId];
    addWorker(worker);
  }

  cluster.on('fork', addWorker);

  const subscriptions = [];

  const subscribe = (type, channel) => {
    subscriptions.push({
      type,
      dst: channel,
      once: false,
      workerId: null,
      predicate: () => true
    });
  };

  const workerExists = (workerId) =>  !!cluster.workers[workerId];

  const send = (type, workerId, payload) => {
    const message = {
      '@@MESSAGE_TYPE': type,
      payload
    };
    const worker = cluster.workers[workerId];
    if (worker) {
      worker.send(message);
    }
    else {
      logger.error('Attempted to send to nonexisting worker', {
        type,
        workerId,
        payload
      });
    }
  };

  const receiveOnce = (type, workerId, predicate, timeout) => {
    const signal = new Signal();
    subscriptions.push({
      type,
      dst: signal,
      once: true,
      workerId: workerId,
      predicate: predicate
    });
    return takeWithTimeout(
      timeout,
      signal,
      () => new Error('Timeout waiting for message from worker of type ' + type,
        {type, workerId, timeout}));
  };

  const process = go(function*() {
    /* eslint no-constant-condition: 0 */
    while (true) {
      const message = yield this.takeOrAbort(ch);
      const type = message['@@MESSAGE_TYPE'];
      if (!type) {
        continue;
      }
      let foundSubscription = false;
      for (let subscription of subscriptions) {
        if (subscription.type === type &&
          (subscription.workerId === null || subscription.workerId === message.workerId) &&
          (!subscription.predicate || subscription.predicate(message.payload))) {
          foundSubscription = true;

          if (subscription.workerId === null) {
            subscription.dst.putSync({
              workerId: message.workerId,
              payload: message.payload
            });
          }
          else {
            if (subscription.dst instanceof Signal) {
              subscription.dst.raise(message.payload);
            }
            else {
              subscription.dst.putSync(message.payload)
            }
          }
          if (subscription.once) {
            subscriptions.splice(subscriptions.indexOf(subscription), 1);
          }
          break;
        }
      }
      if (!foundSubscription) {
        logger.error('Lost message', message);
      }
    }
  });

  return {
    process,
    subscribe,
    receiveOnce,
    send,
    workerExists
  }
};

module.exports = {
  setup
};
