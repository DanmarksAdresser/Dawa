"use strict";

const cluster = require('cluster');
const {go, parallel, Channel, TAKE, Signal } = require('ts-csp');
const {filter, map} = require('transducers-js');
const uuid = require('uuid');
const {sleep, channelEvents, pipe } = require('../util/cspUtil');

const channelIncomingMessages = (channel) => go(function*() {
  const processes = [];
  for (const workerId of Object.keys(cluster.workers)) {
    const ch = new Channel(0, map(msg => {
      msg.workerId = workerId;
      return msg;
    }));
    const worker = cluster.workers[workerId];
    processes.push(channelEvents(worker, 'message', ch));
    processes.push(pipe(ch, channel, 1));
  }
  return yield this.delegateAbort(parallel(...processes));
});

const getIncomingMessage = (source, predicate) => go(function*() {
  const signal = new Signal();
  const handler = msg => {
    if(predicate(msg)) {
      signal.raise(msg);
    }
  };
  source.on('message', handler);
  try {
    return yield this.takeOrAbort(signal);
  }
  finally {
    source.removeListener('message', handler);
  }
});

const getReply = (message, timeout, destination) => go(function*() {
  const id = uuid.v4();
  message['@@REQUEST_ID'] = id;
  destination.send(message);
  const ch = new Channel(0, filter(msg => msg['@@REQUEST_ID'] === id));
  const takeProc = this.delegateAbort(channelIncomingMessages(ch));
  const p2 = this.delegateAbort(sleep(timeout));
  const selectResult = yield this.selectOrAbort([
    {ch, op: TAKE},
    {ch: p2.completed, op: TAKE}
  ]);
  takeProc.abort();
  p2.abort();
  if (selectResult.ch === ch) {
    return selectResult.value;
  }
  else {
    throw new Error('Timout waiting for reply for message');
  }
});

const broadcastWithReply = (message, timeout) => go(function*() {
  const processes = [];
  for (const workerId of Object.keys(cluster.workers)) {
    const worker = cluster.workers[workerId];
    processes.push(go(function*() {
      try {
        return yield this.delegateAbort(getReply(message, timeout, worker));
      }
      catch (err) {
        return err;
      }
    }));
  }
  return yield this.delegateAbort(parallel(...processes));
});

module.exports = {
  channelIncomingMessages,
  getReply,
  broadcastWithReply,
  getIncomingMessage
};
