"use strict";

const cluster = require('cluster');
const fs = require('fs');
const Promise = require('bluebird');
const uuid = require('uuid');
const { go, parallel } = require('ts-csp');
const config = require('@dawadk/common/src/config/holder').getConfig();
const {   queryScheduler,
  connectionScheduler
} = require('../dist-scheduler/dist-scheduler-master-instance');

const packageJson = JSON.parse(fs.readFileSync(__dirname + '/../package.json'));

// get status from a single worker
const  getStatus = (worker) => go(function*() {
  try {
    return yield new Promise((resolve) => {
      const request = {
        type: 'getStatus',
        requestId: uuid.v4(),
        data: {}
      };
      function listener(response) {
        if (response.type === 'status' && response.requestId === request.requestId) {
          worker.removeListener('message', listener);
          resolve(response.data);
        }
      }
      worker.on('message', listener);
      worker.send(request);
    }).timeout(20000);
  }
  catch(e) {
    console.error(e);
    return {
      status: 'down',
      reason: 'Could not get status from worker process',
      error: e
    };
  }
});

const getWorkerStatuses = () => go(function*() {
  const workerIds = Object.keys(cluster.workers);
  const statusProcesses =
    workerIds.map((workerId) => go(function*() {
      const worker = cluster.workers[workerId];
      const status = yield getStatus(worker);
      return {
        id: workerId,
        pid: worker ? worker.process.pid : null,
        isalive: status
      };
    }));
  return yield parallel(...statusProcesses);
});

const isaliveMaster = () => go(function*() {
  const workerStatuses = yield getWorkerStatuses();
  // It seems that NodeJS sometimes leaves dead processes,
  // So we just count that the number of working workers are as expected.
  const numberOfRunningWorkers = workerStatuses.filter(workerStatus => workerStatus.isalive.status === 'up').length;
  const expectedRunningWorkers = config.get('processes');
  return {
    status: numberOfRunningWorkers >= expectedRunningWorkers ? "up" : "down",
    name: packageJson.name,
    version: packageJson.version,
    generation_time: new Date().toISOString(),
    workers: workerStatuses,
    queryScheduler: queryScheduler.status(),
    connectionScheduler: connectionScheduler.status()
  };
});

module.exports = {
  getWorkerStatuses, isaliveMaster
};
