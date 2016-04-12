"use strict";

const q = require('q');

module.exports = function makeLimiter(limit) {
  const currentOpsCount = new Map();
  const queuedOps = new Map();
  return function(key, asyncFn) {
    function run(asyncFn) {
      currentOpsCount.set(key, (currentOpsCount.get(key) || 0) + 1);
      const result = asyncFn();
      result.finally(() => {
        currentOpsCount.set(key, currentOpsCount.get(key) - 1);
        if(currentOpsCount.get(key) === 0) {
          currentOpsCount.delete(key);
        }
        runQueued();
      });
      return result;
    }
    function queue(asyncFn) {
      const queued = queuedOps.get(key) || [];
      queuedOps.set(key, queued);
      return q.Promise((resolve, reject) => {
        queuedOps.get(key).push(function() {
          const result = asyncFn();

          result.then((result) => {
            resolve(result);
          }, (err) => {
            reject(err);
          });
          return result;
        });
      });
    }
    function runQueued() {
      const queued = queuedOps.get(key) || [];
      if(queued.length > 0) {
        const op = queued.shift();
        if(queued.length === 0) {
          queuedOps.delete(key);
        }
        run(op);
      }
    }
    const opsCount = currentOpsCount.get(key) || 0;
    if(opsCount >= limit) {
      return queue(asyncFn);
    }
    else {
      return run(asyncFn);
    }

  }
}