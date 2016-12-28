"use strict";

const expect = require('chai').expect;
const q = require('q');

const fairScheduler = require('../../psql/fair-scheduler');
describe("Fair scheduler", () => {
  let scheduler;
  const scheduleTask = (source) => {
    const taskDescriptor = {
      deferred: q.defer(),
      running: false
    };
    scheduler.schedule(source, () => {
      taskDescriptor.running = true;
      return taskDescriptor.deferred.promise;
    });
    return taskDescriptor;
  };

  const completeTask = (taskDescriptor, result, cost) => {
    if (!taskDescriptor.running) {
      throw new Error('Cannot complete task that is not running');
    }
    taskDescriptor.running = false;
    taskDescriptor.deferred.resolve({
      result: result,
      cost: cost
    });
  };

  beforeEach(() => {
    scheduler = fairScheduler({concurrency: 2});
  });

  it('Should run task immediately if queue is empty', q.async(function*() {
    const taskDescriptor = scheduleTask('source1');
    yield q.delay(0);
    expect(taskDescriptor.running).to.be.true;
    completeTask(taskDescriptor, 'result1', 100);
    yield q.delay(0);
    expect(taskDescriptor.running).to.be.false;
  }));

  it('Exactly <concurrency> tasks should be executing', q.async(function*() {
    const tasks = [scheduleTask('source1'), scheduleTask('source2'), scheduleTask('source3')];
    yield q.delay(0);
    let runningTasks = tasks.reduce((memo, task) => memo + (task.running ? 1 : 0), 0);
    expect(runningTasks).to.equal(2);
    completeTask(tasks[0]);
    yield q.delay(0);
    expect(tasks[0].running).to.be.false;
    runningTasks = tasks.reduce((memo, task) => memo + (task.running ? 1 : 0), 0);
    expect(runningTasks).to.equal(2);
  }));

  it('If a source1 wants to run two tasks of cost 3, and another source wants to run two tasks of cost 1, the second source should finish tasks first.', q.async(function*() {
    scheduler = fairScheduler({concurrency: 1});
    const tasksSource1 = [scheduleTask('source1'), scheduleTask('source1')];
    const tasksSource2 = [scheduleTask('source2'), scheduleTask('source2')];
    yield q.delay(0);
    expect(tasksSource1[0].running).to.be.true;
    completeTask(tasksSource1[0], null, 3);
    yield q.delay(0);
    expect(tasksSource1[1].running).to.be.false;
    expect(tasksSource2[0].running).to.be.true;
    completeTask(tasksSource2[0], null, 1);
    yield q.delay(0);
    expect(tasksSource2[1].running).to.be.true;
  }));

  it('New sources may receive a head start specified by initialPriorityOffset', q.async(function*() {
    scheduler = fairScheduler({
      concurrency:1,
      initialPriorityOffset: -100
    });
    let tasksSource1 = [scheduleTask('source1')];
    yield q.delay(0);
    completeTask(tasksSource1[0], null, 100);
    const tasksSource2 = [scheduleTask('source2'), scheduleTask('source2')];
    [scheduleTask('source1')];
    yield q.delay(0);
    expect(tasksSource2[0].running).to.be.true;
    completeTask(tasksSource2[0], null, 50);
    yield q.delay(0);
    // the source2 task will be running, because it received a 100 head start.
    expect(tasksSource2[1].running).to.be.true;
  }));

  it('Should cleanup sources with priority lower than top + offest', q.async(function*() {
    scheduler = fairScheduler({
      concurrency:1,
      initialPriorityOffset: -100,
      cleanupInterval: 0
    });
    let taskSource1 = scheduleTask('source1');
    yield q.delay(0);
    completeTask(taskSource1, null, 100);
    expect(scheduler.internal.descriptor('source1')).to.not.be.null;
    let taskSource2 = scheduleTask('source2');
    yield q.delay(0);
    completeTask(taskSource2, null, 300);
    yield q.delay(1);
    taskSource2 = scheduleTask('source2');
    yield q.delay(0);
    completeTask(taskSource2, null, 300);
    expect(scheduler.internal.topPriority()).to.equal(200);
    yield q.delay(0);
    expect(scheduler.internal.descriptor('source1')).to.be.undefined;
    expect(scheduler.internal.descriptor('source2')).to.not.be.undefined;
  }));
});
