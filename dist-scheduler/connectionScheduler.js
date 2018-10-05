const _ = require('underscore');

class ScheduledTask {
  constructor(sourceId, taskId) {
    this.sourceId = sourceId;
    this.taskId = taskId;
    this.startedTimestamp = null;
  }
}

class ConnectionScheduler {
  constructor(options) {
    this.scheduledTasks = [];
    this.slotCount = options.slots || 1;
    this.maxSlotsPerSource = options.slotsPerSource || 1;
  }
  scheduleTask(sourceId, taskId) {
    this.scheduledTasks.push(new ScheduledTask(sourceId, taskId));
  }

  runningTasks() {
    return this.scheduledTasks.filter(task => task.startedTimestamp !== null);
  }

  runningTaskCount() {
    return this.runningTasks().length;
  }

  pendingTasks() {
    return this.scheduledTasks.filter(task => task.startedTimestamp === null);
  }

  pendingTaskCount() {
    return this.pendingTasks().length;
  }

  remainingSlotCount() {
    return this.slotCount - this.runningTaskCount();
  }

  pendingTasksBySource() {
    const pending = _.groupBy(this.pendingTasks(), 'sourceId');
    for (let task of this.scheduledTasks) {
      pending[task.sourceId] = pending[task.sourceId] || [];
    }
    return pending;
  }

   runningTasksBySource() {
    const running = _.groupBy(this.runningTasks(), 'sourceId');
     for (let task of this.scheduledTasks) {
       running[task.sourceId] = running[task.sourceId] || [];
     }
     return running;
  }

  containsTask(taskId) {
    for(let task of this.scheduledTasks) {
      if(task.taskId === taskId) {
        return true;
      }
    }
    return false;
  }

  _getTaskToRun() {
    const runningTasksBySource = this.runningTasksBySource();
    const runningTaskCount = Object.values(runningTasksBySource).map(tasks => tasks.length).reduce((memo, count) => memo + count, 0);
    if(runningTaskCount >= this.slotCount) {
      return null;
    }
    const pendingTasksBySource = this.pendingTasksBySource();
    const eligiblePendingSources = Object.keys(pendingTasksBySource).filter(
      sourceId => pendingTasksBySource[sourceId].length > 0 &&
        runningTasksBySource[sourceId].length < this.maxSlotsPerSource);
    if(eligiblePendingSources.length === 0) {
      return null;
    }
    else {
      const sourceId = _.min(eligiblePendingSources, sourceId => runningTasksBySource[sourceId].length);
      return pendingTasksBySource[sourceId][0];
    }
  }

  exceedsQueueLimit(sourceId) {
    const taskCount = this.scheduledTasks.filter(task => task.sourceId===sourceId).length;
    return taskCount >= this.maxSlotsPerSource;
  }

  canRunTask() {
    const taskToRun = this._getTaskToRun();
    return taskToRun !== null;
  }


  runTask(currentTime) {
    const task = this._getTaskToRun();
    task.startedTimestamp = currentTime;
    return task.taskId;
  }

  completeTask(taskId, currentTime) {
    this.scheduledTasks = this.scheduledTasks.filter(task => task.taskId !== taskId);
  }

  status() {
    const pendingTasksCount = _.mapObject(this.pendingTasksBySource(), tasks => tasks.length);
    const runningTasksCount = _.mapObject(this.runningTasksBySource(), tasks => tasks.length);
    return { pending: pendingTasksCount, running: runningTasksCount};
  }
}

module.exports = {
  ConnectionScheduler
};