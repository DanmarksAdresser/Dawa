"use strict";

const { EventEmitter } = require('events');

class FakeWorkerMaster extends EventEmitter {
  constructor(fakeMaster, workerId) {
    super();
    this.fakeMaster = fakeMaster;
    this.id = workerId;
  }

  send(messageToWorker) {
    this.fakeMaster._sendToWorker(this.id, messageToWorker);
  }

  _receiveFromWorker(message) {
    this.emit('message', message);
  }
}

class FakeClusterMaster extends EventEmitter {
  constructor() {
    super();
    this.idCount = 1;
    this.workers = {};
    this._fakeWorkerProcesses = {};
  }

  fakeFork() {
    const workerId = '' + this.idCount++;
    this.workers[workerId] = new FakeWorkerMaster(this, workerId);
    this._fakeWorkerProcesses[workerId] = new FakeWorkerProcess(this, workerId);
    this.emit('fork', this.workers[workerId]);
    return this._fakeWorkerProcesses[workerId];
  }

  _sendToWorker(workerId, message) {
    if(this._fakeWorkerProcesses[workerId]) {
      this._fakeWorkerProcesses[workerId]._receiveFromMaster(message);
    }
  }

  _receiveFromWorker(workerId, message) {
    if(this.workers[workerId]) {
      this.workers[workerId]._receiveFromWorker(message);
    }
  }
}

class FakeWorkerProcess extends EventEmitter {
  constructor(fakeMaster, workerId) {
    super();
    this.fakeMaster = fakeMaster;
    this.workerId = workerId;
  }

  send(message) {
    this.fakeMaster._receiveFromWorker(this.workerId, message);
  }

  _receiveFromMaster(messageFromMaster) {
    this.emit('message', messageFromMaster);
  }
}

module.exports = {
  FakeClusterMaster
};
