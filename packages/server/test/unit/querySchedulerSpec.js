"use strict";

const { assert } = require('chai');

const {QueryScheduler} = require('../../dist-scheduler/queryScheduler');

describe('Query Scheduler', () => {
  it('Will allow up to slotsPerSource tasks per source', () => {
    const scheduler = new QueryScheduler({slots: 3, slotsPerSource: 2});
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

  it('If a source1 wants to run two tasks of cost 3, and another source wants to run two tasks of cost 1, the second source should finish tasks first.', () => {
    const scheduler = new QueryScheduler({slots: 3, slotsPerSource: 2});
    scheduler.scheduleTask("source1", "task1");
    scheduler.scheduleTask("source2", "task2");
    const first = scheduler.runTask(1);
    assert.strictEqual(first, "task1");
    const second = scheduler.runTask(1);
    assert.strictEqual(second, "task2");
    scheduler.completeTask("task2", 2);
    scheduler.completeTask(first, 4);
    scheduler.scheduleTask("source1", "task3");
    scheduler.scheduleTask("source2", "task4");
    const third = scheduler.runTask(4);
    assert.strictEqual(third, "task4");
  });
});