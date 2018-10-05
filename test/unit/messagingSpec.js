"use strict";

const { assert } = require('chai');

const { go, Channel } = require('ts-csp');
const { sleep } = require('../../util/cspUtil');
const messagingMaster = require('../../messaging/messaging-master');
const messagingWorker = require('../../messaging/messaging-worker');
const { FakeClusterMaster } = require('../helpers/fake-cluster');


describe('Messaging', () => {
  let messagingInstanceMaster, messagingInstanceWorker1, messagingInstanceWorker2;

  beforeEach(() => {
    const cluster = new FakeClusterMaster();
     messagingInstanceMaster = messagingMaster.setup(cluster);
     const processWorker1 = cluster.fakeFork();
     const processWorker2 = cluster.fakeFork();
     messagingInstanceWorker1 = messagingWorker.setup(processWorker1);
     messagingInstanceWorker2 = messagingWorker.setup(processWorker2);
  });

  it('Can send a message from master to worker', () => go(function*() {
    const receiveProcess = messagingInstanceWorker1.receiveOnce('MSG_TYPE', () => true, 1000);
    messagingInstanceMaster.send('MSG_TYPE', '1', {foo: 'bar'});
    const receivedMessage = yield receiveProcess;
    assert.deepEqual(receivedMessage, { foo: 'bar'});
  }));

  it('Can send a message from worker to master', () => go(function*() {
    const receiveProcess = messagingInstanceMaster.receiveOnce('MSG_TYPE', '2', () => true, 1000);
    messagingInstanceWorker2.send('MSG_TYPE', {foo: 'bar'});
    const receivedMessage = yield receiveProcess;
    assert.deepEqual(receivedMessage, { foo: 'bar'});
  }));

  it('If a master subscribes to messages, it will receive messages of that type', () => go(function*() {
    const ch = new Channel();
    messagingInstanceMaster.subscribe('MSG_TYPE', ch);
    messagingInstanceWorker2.send('MSG_TYPE', { foo: 'bar'});
    const received = yield ch.take();
    assert.deepEqual(received, {
      workerId: '2',
      payload: { foo: 'bar'}
    });
  }));
  it('If a master subscribes to messages, it will not receive messages of a different type', () => go(function*() {
    const ch = new Channel();
    messagingInstanceMaster.subscribe('MSG_TYPE', ch);
    messagingInstanceWorker2.send('MSG_TYPE_WRONG', { foo: 'bar'});
    yield sleep(1);
    assert.strictEqual(ch.canTakeSync(1), false);
  }));

  it('If a worker subscribes to messages, it will receive messages of that type', () => go(function*() {
    const ch = new Channel();
    messagingInstanceWorker2.subscribe('MSG_TYPE', ch);
    messagingInstanceMaster.send('MSG_TYPE', '2', { foo: 'bar'});
    const received = yield ch.take();
    assert.deepEqual(received, {foo: 'bar'});
  }));

  it('If master receiveOnce times out, the process fails', () => go(function*() {
    let failed = true;
    try {
      yield messagingInstanceMaster.receiveOnce('MSG_TYPE', '1', () => true, 1);
      failed = false;
    }
    catch(e) {
      assert.strictEqual(e.message, 'Timeout waiting for message from worker of type MSG_TYPE');
    }
    assert(failed);
  }));

  it('If worker receiveOnce times out, the process fails', () => go(function*() {
    let failed = true;
    try {
      yield messagingInstanceWorker1.receiveOnce('MSG_TYPE', () => true, 1);
      failed = false;
    }
    catch(e) {
      assert.strictEqual(e.message, 'Timeout waiting for message from master');
    }
    assert(failed);
  }));
});
