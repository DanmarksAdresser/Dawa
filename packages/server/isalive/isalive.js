"use strict";

var cluster = require('cluster');
var fs = require('fs');
var q = require('q');
var uuid = require('uuid');

const {   queryScheduler,
  connectionScheduler
} = require('../dist-scheduler/dist-scheduler-master-instance');

var packageJson = JSON.parse(fs.readFileSync(__dirname + '/../package.json'));

// get status from a single worker
function getStatus(worker) {
  var deferred = q.defer();
  var request = {
    type: 'getStatus',
    requestId: uuid.v4(),
    data: {}
  };
  function listener(response) {
    if (response.type === 'status' && response.requestId === request.requestId) {
      worker.removeListener('message', listener);
      deferred.resolve(response.data);
    }
  }
  worker.on('message', listener);
  worker.send(request);
  return q.timeout(deferred.promise, 15000);
}

exports.getWorkerStatuses = function() {
  var workerIds = Object.keys(cluster.workers);
  var statusPromises =
    workerIds.map(function(workerId) {
      var worker = cluster.workers[workerId];
      return getStatus(worker);
    });
  var result = [];
  return q.allSettled(statusPromises).then(function(statuses) {
    for(var i = 0; i < workerIds.length; ++i) {
      var workerId = workerIds[i];
      var worker = cluster.workers[workerId];
      var status = statuses[i];
      result.push({
        id: workerId,
        pid: worker ? worker.process.pid : null,
        isalive: status.state === 'fulfilled' ? status.value : {
          status: 'down',
          reason: 'Could not get status from worker process'
        }
      });
    }
    return result;
  });

};

exports.isaliveMaster = function() {
  var result = {
    name: packageJson.name,
    version: packageJson.version,
    generation_time: new Date().toISOString()
  };
  var workerStatusesPromise = exports.getWorkerStatuses();
  return q.all([workerStatusesPromise]).spread(function(workerStatuses) {
      result.workers = workerStatuses;
      result.queryScheduler = queryScheduler.status();
      result.connectionScheduler = connectionScheduler.status();
      return result;
    });

};
