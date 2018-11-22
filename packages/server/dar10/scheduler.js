"use strict";

const q = require('q');

const logger = require('@dawadk/common/src/logger').forCategory('scheduler');

/**
 * Thin wrapper around setTimeout, which runs asyncFn at a specified interval,
 * but skips if running the function takes longer than the interval. The first run
 * is immediate
 * @param intervalMs time between runs in ms
 * @param asyncFn async function returning a promise
 * @returns {*} a function to stop the scheduler
 */
exports.schedule = (intervalMs, asyncFn, errorFn) => {
  let shouldAbort = false;

  q.async(function*() {
    while(!shouldAbort) {
      const before = Date.now();
      try {
        yield asyncFn();
      }
      catch(e) {
        if(errorFn) {
          errorFn(e);
        }
        else {
          logger.error('Scheduler job failed', e);
        }
      }
      const duration = Date.now() - before;
      yield q.delay(Math.max(0, intervalMs - duration));
    }
  })();
  return () => shouldAbort = true;
};
