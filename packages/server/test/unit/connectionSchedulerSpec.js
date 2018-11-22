"use strict";

const { assert } = require('chai');

const {ConnectionScheduler} = require('../../dist-scheduler/connectionScheduler');

describe('Connection Scheduler', () => {
  it('Will allow up to maxSlotsPerSource tasks per source', () => {
    const scheduler = new ConnectionScheduler({slots: 3, slotsPerSource: 2});
    assert(!scheduler.canRunTask());
    scheduler.scheduleTask("source1", "task1");
    scheduler.scheduleTask("source1", "task2");
    scheduler.scheduleTask("source1", "task3");
    assert(scheduler.canRunTask());
    const firstTask = scheduler.runTask(1);
    assert.strictEqual(firstTask, "task1");
    assert(scheduler.canRunTask());
    const secondTask = scheduler.runTask(1);
    assert.strictEqual(secondTask, 'task2');
    assert(!scheduler.canRunTask());
    scheduler.completeTask("task1", 2);
    assert(scheduler.canRunTask());
    const thirdTask = scheduler.runTask(2);
    assert.strictEqual(thirdTask, "task3");
  });

  it('If two sources have are ready to run, the one with fewer running tasks will be chosen', () => {
    const scheduler = new ConnectionScheduler({slots: 3, slotsPerSource: 2});
    assert(!scheduler.canRunTask());
    scheduler.scheduleTask("source1", "task1");
    scheduler.scheduleTask("source1", "task2");
    scheduler.scheduleTask("source1", "task3");
    scheduler.scheduleTask("source2", "task4");
    scheduler.scheduleTask("source2", "task5");
    assert(scheduler.canRunTask());
    const firstTask = scheduler.runTask(1);
    assert.strictEqual(firstTask, "task1");
    assert(scheduler.canRunTask());
    const secondTask = scheduler.runTask(1);
    assert.strictEqual(secondTask, 'task4');
    assert(scheduler.canRunTask());
    const thirdTask = scheduler.runTask(1);
    assert.strictEqual(thirdTask, "task2");
    scheduler.completeTask('task1', 2);
    const fourthTask = scheduler.runTask(1);
    assert.strictEqual(fourthTask, "task3");


  });

});