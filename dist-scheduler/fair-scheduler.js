"use strict";

const FastPriorityQueue = require('fastpriorityqueue');
const q = require('q');

/**
 * A fair scheduler. Launches at most *concurrency* concurrent tasks.
 * A task is a no-arg function which returs a result and a cost.
 * Each source is allocated the same amount of resources based on the
 * cost of executing each task.
 *
 */

module.exports = (options) => {

  const slots = options.slots || 1;
  const concurrencyPerSource = options.slotsPerSource || 1;
  const prioritySlots = options.prioritySlots || 0;
  const initialPriorityOffset = options.initialPriorityOffset || 0;
  const cleanupInterval = options.cleanupInterval || 0;
  const requiredPriorityOffset = options.requiredPriorityOffset || 0;
  const sourceDescriptorMap = {};
  let activeCount = 0;
  let topPriority = 0;
  let priorityRunning = 0;
  let lastCleanup = Date.now();

  const queue = new FastPriorityQueue((a, b) => {
    return a.queueKey < b.queueKey;
  });

  const queueAdd = (descriptor) => {
    descriptor.queueKey = descriptor.priority;
    queue.add(descriptor);
  };

  const queuePeek = () => {
    while(true) {
      const descriptor = queue.peek();
      if(descriptor.queueKey !== descriptor.priority) {
        queue.poll();
        queueAdd(descriptor);
      }
      else {
        return descriptor;
      }
    }
  };

  const inactive = new Set();
  /**
   * Remove sources from top of queue until encountering a source with a pending task
   * or queue is empty.
   */
  function removeTasklessSources() {
    while(!queue.isEmpty()) {
      const sourceDescriptor = queuePeek();
      const tasks = sourceDescriptor.tasks;
      if(tasks.length === 0) {
        queue.poll();
        inactive.add(sourceDescriptor);
      }
      else {
        break;
      }
    }
    if(inactive.size > 0 && lastCleanup + cleanupInterval < Date.now()) {
      lastCleanup = Date.now();
      for(let sourceDescriptor of inactive.values()) {
        if(sourceDescriptor.priority <= topPriority - initialPriorityOffset) {
          inactive.delete(sourceDescriptor);
          delete sourceDescriptorMap[sourceDescriptor.source];
        }
      }
    }
  }

  /**
   * Run a task from top of queue. Assumes that the queue is not empty,
   * and that the top of the queue has at least one task.
   * @returns {*}
   */
  function runTopTask(){
    const sourceDescriptor = queue.poll();
    const tasks = sourceDescriptor.tasks;
    const task = tasks.shift();
    topPriority = Math.max(topPriority, sourceDescriptor.priority);
    ++activeCount;
    return q.async(function*() {
      sourceDescriptor.running += 1;
      const runPrioritized = sourceDescriptor.priority < topPriority;
      if(runPrioritized) {
        priorityRunning++;
      }
      if(sourceDescriptor.running < concurrencyPerSource) {
        queueAdd(sourceDescriptor);
      }

      const promise = Promise.resolve(task.asyncTaskFn());
      const taskResult = yield promise;
      if(runPrioritized) {
        priorityRunning--;
      }
      if(sourceDescriptor.running ===  concurrencyPerSource) {
        queueAdd(sourceDescriptor);
      }
      sourceDescriptor.running -= 1;
      --activeCount;
      const cost = taskResult.cost;
      const result = taskResult.result;
      sourceDescriptor.priority += cost;

      task.deferred.resolve({
        result: result,
        cost: cost
      });
    })();

  }

  return {
    status: () => {
      const clients = Object.keys(sourceDescriptorMap);
      clients.sort();
      const clientDescs = clients.map(client => {
        const descriptor = sourceDescriptorMap[client];
        return {
          client,
          tasks: descriptor.tasks.length,
          priority: descriptor.priority,
          running: descriptor.running
        };
      });
      return {
        activeCount,
        topPriority,
        priorityRunning,
        lastCleanup: new Date(lastCleanup).toISOString(),
        options: {
          slots,
          concurrencyPerSource,
          prioritySlots,
          initialPriorityOffset,
          cleanupInterval,
          requiredPriorityOffset
        },
        clients: clientDescs
      };
    },
    schedule: (source, asyncTaskFn) => {
      if(!sourceDescriptorMap[source]) {
        const sourceDescriptor = {
          source: source,
          tasks: [],
          priority: topPriority - initialPriorityOffset,
          running: 0
        };
        sourceDescriptorMap[source] = sourceDescriptor;
        queueAdd(sourceDescriptor);
      }
      else {
        if(inactive.has(sourceDescriptorMap[source])) {
          const sourceDescriptor = sourceDescriptorMap[source];
          inactive.delete(sourceDescriptor);
          sourceDescriptor.priority = Math.max(topPriority - initialPriorityOffset, sourceDescriptor.priority);
          queueAdd(sourceDescriptor);
        }
      }
      const sourceDescriptor = sourceDescriptorMap[source];
      const deferred = q.defer();

      sourceDescriptor.tasks.push({
        asyncTaskFn: asyncTaskFn,
        deferred: deferred
      });

      const nextIsPriorityTask = queuePeek().priority < topPriority - requiredPriorityOffset;
      const remainingPrioritySlots = Math.max(0, prioritySlots - priorityRunning);
      const mayRunAsNonPriority = activeCount < slots - remainingPrioritySlots;
      const mayRunAsPriority = nextIsPriorityTask && remainingPrioritySlots > 0;
      if(mayRunAsPriority || mayRunAsNonPriority) {
        q.async(function*() {
          /* eslint no-constant-condition: 0 */
          while(true) {
            removeTasklessSources();
            if(queue.isEmpty()) {
              break;
            }
            const nextIsPriorityTask = queuePeek().priority < topPriority;
            if((nextIsPriorityTask && remainingPrioritySlots > 0) ||  (activeCount < slots - prioritySlots + priorityRunning)) {
              yield runTopTask();
            }
            else {
              break;
            }
          }
        })();
      }
      return deferred.promise;
    },
    internal: {
      inactive: () => inactive,
      descriptor: (source) => sourceDescriptorMap[source],
      topPriority: () => topPriority
    },

  }
};
