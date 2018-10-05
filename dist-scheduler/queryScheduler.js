const _ = require('underscore');

class Task {
  constructor(sourceId, taskId) {
    this.sourceId = sourceId;
    this.taskId = taskId;
    this.startedTimestamp = null;
  }
}

class QueryScheduler {
  constructor(options) {
    this.slots = options.slots || 1;
    this.slotsPerSource = options.slotsPerSource || 1;
    this.prioritySlots = options.prioritySlots || 0;
    this.initialPriorityOffset = options.initialPriorityOffset || 0;
    this.cleanupInterval = options.cleanupInterval || 0;
    this.requiredPriorityOffset = options.requiredPriorityOffset || 0;

    this.tasks = [];
    this.sourcePriorities = {};
    this.priorityThreshold = 0;
  }

  runningTasks() {
    return this.tasks.filter(task => task.startedTimestamp !== null);
  }

  runningTaskCount() {
    return this.runningTasks().length;
  }

  pendingTasks() {
    return this.tasks.filter(task => task.startedTimestamp === null);
  }

  pendingTaskCount() {
    return this.pendingTasks().length;
  }

  remainingSlotCount() {
    return this.slots - this.runningTaskCount();
  }


  pendingTasksBySource() {
    const pending = _.groupBy(this.pendingTasks(), 'sourceId');
    for (let sourceId of Object.keys(this.sourcePriorities)) {
      pending[sourceId] = pending[sourceId] || [];
    }
    return pending;
  }

  runningTasksBySource() {
    const running = _.groupBy(this.runningTasks(), 'sourceId');
    for (let sourceId of Object.keys(this.sourcePriorities)) {
      running[sourceId] = running[sourceId] || [];
    }
    return running;
  }

  exceedsQueueLimit(sourceId) {
    return false;
  }

  scheduleTask(sourceId, taskId) {
    if (!this.sourcePriorities.hasOwnProperty(sourceId)) {
      this.sourcePriorities[sourceId] = this.priorityThreshold - this.initialPriorityOffset;
    }
    this.tasks.push(new Task(sourceId, taskId));
  }

  containsTask(taskId) {
    for(let task of this.tasks) {
      if(task.taskId === taskId) {
        return true;
      }
    }
    return false;
  }

  canRunTask() {
    if (this.remainingSlotCount() === 0) {
      return false;
    }
    const nonPriorityAllowed = this.remainingSlotCount() - this.prioritySlots > 0;
    const runningBySource = this.runningTasksBySource();
    const pendingBySource = this.pendingTasksBySource();
    const eligibleSources = Object.keys(runningBySource).filter(source => {
      return pendingBySource[source].length > 0 &&
        runningBySource[source].length < this.slotsPerSource &&
        (nonPriorityAllowed || this.sourcePriorities[source] < this.priorityThreshold);
    });
    return eligibleSources.length > 0;
  }

  runTask(currentTime) {
    const nonPriorityAllowed = this.remainingSlotCount() - this.prioritySlots > 0;
    const runningBySource = this.runningTasksBySource();
    const pendingBySource = this.pendingTasksBySource();
    const eligibleSources = Object.keys(runningBySource).filter(source => {
      return pendingBySource[source].length > 0 &&
        runningBySource[source].length < this.slotsPerSource &&
        (nonPriorityAllowed || this.sourcePriorities[source] < this.priorityThreshold);
    });
    const chosenSource = _.min(eligibleSources, source => this.sourcePriorities[source]);
    const chosenTask = pendingBySource[chosenSource][0];
    chosenTask.startedTimestamp = currentTime;
    this.priorityThreshold = Math.max(this.priorityThreshold, this.sourcePriorities[chosenSource]);
    this.sourcePriorities = _.mapObject(this.sourcePriorities, priority => Math.max(priority, this.priorityThreshold - this.initialPriorityOffset));
    for (let source of Object.keys(this.sourcePriorities)) {
      if (runningBySource[source].length === 0 && pendingBySource[source].length === 0 &&
        this.sourcePriorities[source] === this.priorityThreshold - this.initialPriorityOffset) {
        delete this.sourcePriorities[source];
      }
    }
    return chosenTask.taskId;
  }

  completeTask(taskId, currentTime) {
    const task = this.tasks.find(task => task.taskId === taskId);
    if (task.startedTimestamp) {
      const duration = currentTime - task.startedTimestamp;
      this.sourcePriorities[task.sourceId] += duration;
    }
    this.tasks = this.tasks.filter(task => task.taskId !== taskId);
  }

  status() {
    const pendingCount = _.mapObject(this.pendingTasksBySource(), tasks => tasks.length);
    const runningCount = _.mapObject(this.runningTasksBySource(), tasks => tasks.length);
    return {
      pendingCount,
      runningCount,
      priorities: this.sourcePriorities,
      priorityThreshold: this.priorityThreshold
    };
  }
}

module.exports = {
  QueryScheduler
};