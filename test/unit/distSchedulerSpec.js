"use strict";

const { assert } = require('chai');

const { go, Signal } = require('ts-csp');
const { sleep } = require('../../util/cspUtil');
const messagingMaster = require('../../messaging/messaging-master');
const messagingWorker = require('../../messaging/messaging-worker');
const distSchedulerMaster = require('../../dist-scheduler/dist-scheduler-master');
const distSchedulerClient = require('../../dist-scheduler/dist-scheduler-client');
const { FakeClusterMaster } = require('../helpers/fake-cluster');


describe('Distributed scheduler', () => {
  /* eslint no-unused-vars: 0 */
  let master, client1, client2;
  const OPTIONS = {
    concurrency: 2,
    cleanupInterval: 5000,
    initialPriorityOffset: -2000,
    prioritySlots: 1,
    timeout: 120
  };
  beforeEach(() => {
    const cluster = new FakeClusterMaster();
    const messagingInstanceMaster = messagingMaster.setup(cluster);
    const processWorker1 = cluster.fakeFork();
    const processWorker2 = cluster.fakeFork();
    const messagingInstanceWorker1 = messagingWorker.setup(processWorker1);
    const messagingInstanceWorker2 = messagingWorker.setup(processWorker2);
    master = distSchedulerMaster.create(messagingInstanceMaster, OPTIONS);
    client1 = distSchedulerClient.create(messagingInstanceWorker1, {
      timeout: 100
    });
    client2 = distSchedulerClient.create(messagingInstanceWorker2, {
      timeout: 100
    });
  });

  it('Can scedule a piece of work', () => go(function*() {
    const taskRan = new Signal();
    const scheduledProcess = client1.schedule('ip1', () => go(function*() {
      yield sleep(50);
      taskRan.raise();
      return 'foo';
    }));
    yield sleep(20);
    assert.isFalse(taskRan.isRaised());
    yield taskRan.take();
    const result = yield scheduledProcess;
    assert.strictEqual(result, 'foo');
  }));

  it('If client times out, the scheduled process fails', () => go(function*() {
    const taskRan = new Signal();
    // block queue with existing task
    client1.schedule('ip1', () => sleep(1000));

    const scheduledProcess = client1.schedule('ip1', () => go(function*() {
      yield sleep(1000);
      taskRan.raise();
      return 'foo';
    }));
    let failed = true;
    try {
      yield scheduledProcess;
      failed = false;
    }
    catch(err) {
      assert.strictEqual(err.message, 'Timeout waiting for query slot');
    }
    assert.isTrue(failed);
  }));

});
