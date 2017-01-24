"use strict";

const q = require('q');

const CLOSED = {};
const TAKE = {};
const PUT = {};

const NULL_RESOLVED = q.resolve(null);

class Channel {
  constructor(bufsize) {
    this.putters = [];
    this.values = [];
    this.takers = [];
    this.takeSelectors = [];
    this.putSelectors = [];
    this.closed = false;
    this.bufsize = bufsize || 0;
  }

  bufferRemaining() {
    return this.bufsize - this.values.length + this.putters.length;
  }

  canTakeImmediate() {
    return this.values.length > 0 || this.closed || this.putSelectors.length > 0;
  }

  canPutImmediate() {
    return this.bufferRemaining() > 0 || this.takers.length > 0 || this.takeSelectors.length > 0;
  }

  isClosed() {
    return this.closed;
  }

  close() {
    this.closed = true;
    while(this.takers.length > 0) {
      const taker = this.takers.shift();
      taker(this, CLOSED);
    }
    while(this.takeSelectors.length > 0) {
      this._notifyTakeSelector();
    }
    while(this.putSelectors.length > 0) {
      this._notifyPutSelector();
    }

  }

  _selectForTake(cb) {
    if(this.canTakeImmediate()) {
      throw new Error('Cannot select for take when value is available');
    }
    this.takeSelectors.push(cb);
  }

  _unselectForTake(cb) {
    const index = this.takeSelectors.indexOf(cb);
    if(index !== -1) {
      this.takeSelectors.splice(index, 1);
    }
  }

  _selectForPut(cb) {
    if(this.canPutImmediate()) {
      throw new Error('Cannot select for put when taker is available');
    }
    this.putSelectors.push(cb);
  }

  _unselectForPut(cb) {
    const index = this.putSelectors.indexOf(cb);
    if(index !== -1) {
      this.putSelectors.splice(index, 1);
    }
  }

  _notifyPutSelector() {
    const cb = this.putSelectors.shift();
    cb(this, PUT);
  }

  _notifyTakeSelector() {
    const cb = this.takeSelectors.shift();
    cb(this, TAKE);
  }

  takeImmediate() {
    if(!this.canTakeImmediate()) {
      throw new Error('No immediate value available');
    }
    if(this.values.length > 0) {
      const value = this.values.shift();
      if(this.bufferRemaining() >= 0 && this.putters.length > 0) {
        const putter = this.putters.shift();
        putter(this);
      }
      return value;
    }
    else if(this.closed) {
      return CLOSED;
    }
    else if(this.putSelectors.length > 0) {
      this._notifyPutSelector();
      return this.takeImmediate();
    }
    else {
      throw new Error('Unexpected: Could not take immediate');
    }
  }

  take() {
    if(this.canTakeImmediate()) {
      return q.resolve(this.takeImmediate());
    }
    else {
      return q.Promise((resolve, reject) => {
        this.takers.push((ch, value, error) => {
          if(error) {
            reject(error);
          }
          else {
            resolve(value);
          }
        });
      });
    }
  }

  putImmediate(value, allowOverflow) {
    if(!allowOverflow && !this.canPutImmediate()) {
      throw new Error('Cannot put immediate');
    }
    if(this.takers.length > 0) {
      const taker = this.takers.shift();
      taker(this, value);
      return null;
    }
    else {
      this.values.push(value);
      if(this.takeSelectors.length > 0) {
        this._notifyTakeSelector();
      }
      return null;
    }
  }

  put(value) {
    if(this.closed) {
      return q.reject(new Error('cannot put to closed channel'));
    }
    if(this.canPutImmediate()) {
      this.putImmediate(value);
      return NULL_RESOLVED;
    }
    else {
      this.values.push(value);
      return q.Promise((resolve, reject) => {
        this.putters.push((ch, error) => {
          if(error) {
            reject(error);
          }
          else {
            resolve(null);
          }
        });
      });
    }
  }
}

class Signal {
  constructor() {
    this.raised = false;
    this.selectors = [];
    this.deferred = q.defer();
    this.connected = [];
  }

  isClosed() {
    return false;
  }

  canTakeImmediate() {
    return this.raised;
  }

  _selectForTake(selector) {
    if(this.raised) {
      throw new Error('Not allowed to select on raised signal');
    }
    this.selectors.push(selector);
  }

  _unselectForTake(cb) {
    const index = this.selectors.indexOf(cb);
    if(index !== -1) {
      this.selectors.splice(index, 1);
    }
  }

  raise(value) {
    this.raised = true;
    this.deferred.resolve(value);
    while(this.selectors.length > 0) {
      const cb = this.selectors.shift();
      cb(this, TAKE);
    }
    for(let signal of this.connected) {
      signal.raise(value);
      this.connected = [];
    }
  }

  takeImmediate() {
    return this._value;
  }

  take() {
    return this.deferred.promise;
  }

  connect(signal) {
    if(this.raised) {
      signal.raise(this.takeImmediate());
    }
    else {
      this.connected.push(signal);
    }
  }
}

const select = function(selectSpec) {
  for(const spec of selectSpec) {
    const {ch, op, value} = spec;
    if(op === TAKE && ch.canTakeImmediate()) {
      const value = ch.takeImmediate();
      return q.resolve({
        ch: ch,
        op: op,
        value: value
      });
    }
    else if(op === PUT && ch.canPutImmediate()) {
      ch.putImmediate(value);
      return q.resolve(spec);
    }
  }
  return q.promise((resolve, reject) => {
    const cb = (ch, op) => {
      for(const spec of selectSpec) {
        let { ch, op} = spec;
        if(op === TAKE) {
          ch._unselectForTake(cb);
        }
        else {
          ch._unselectForPut(cb);
        }
      }
      if( ch.isClosed() && op === PUT){
        reject({ch, op, error: new Error('Channel Closed while waiting to PUT')});
      }
      else if(op === TAKE) {
        const value = ch.takeImmediate();
        resolve({
          ch, op, value
        });
      }
      else if (op === PUT) {
        for(let spec of selectSpec) {
          if(spec.ch === ch && spec.op === op){
            const value = spec.value;
            ch.putImmediate(value, true);
            resolve({
              ch, op
            });
            return;
          }
        }
        reject(new Error('Unexpected: could not find value to put'));
      }
    };

    for(const spec of selectSpec) {
      let {ch, op} = spec;
      if(op === TAKE) {
        ch._selectForTake(cb);
      }
      else {
        ch._selectForPut(cb);
      }
    }
  });
};

const putMany = (channel, array) => {
  for(let i = 0; i < array.length - 1; ++i) {
    channel.putImmediate(array[i], true);
  }
  if(array.length > 0) {
    return channel.put(array[array.length - 1]);
  }
};

const promiseToSignal = p => {
  const signal = new Signal();
  p.then(result => signal.raise(result), error => {
    if(error instanceof Error) {
      signal.raise(error);
    }
    else {
      signal.raise(new Error(error));
    }
  });
  return signal;
};

const go = (generator, ...args) => {
  return promiseToSignal(q.async(generator)(...args));
};

const takeOrThrow = (ch, errorSignal) => q.async(function*() {
  if(errorSignal.raised) {
    throw errorSignal.takeImmedate();
  }
  if(ch.canTakeImmediate()) {
    return ch.takeImmediate();
  }
  const selectResult = yield select([
    { ch: errorSignal, op: TAKE },
    { ch: ch, op: TAKE }
  ]);
  if(selectResult.ch === errorSignal) {
    throw selectResult.value;
  }
  else {
    return selectResult.value;
  }
})();

const wrapWritableStream = stream => {
  const errorSignal = new Signal();
  const finishSignal = new Signal();
  stream.once('error', (err) => errorSignal.raise(err));
  stream.once('finish', () => finishSignal.raise());
  const ch = new Channel();
  let wantMoreDataSignal  = null;
  go(function*() {
    try {
      while(true) {/* eslint no-constant-condition: 0 */
        const val = yield takeOrThrow(ch, errorSignal);
        if(val === CLOSED) {
          stream.end();
          return;
        }
        const writeResult = stream.write(val);
        if(!writeResult) {
          console.log('awaiting DRAIN!');
          wantMoreDataSignal = new Signal();
          stream.once('drain', () => wantMoreDataSignal.raise());
          yield takeOrThrow(wantMoreDataSignal, errorSignal);
          wantMoreDataSignal = null;
        }
      }
    }
    catch(e) {
      // Already handled using errorSignal
    }
  });
  return {
    ch: ch,
    errorSignal: errorSignal,
    finishSignal: finishSignal
  }
};

module.exports = {
  Channel,
  Signal,
  select,
  CLOSED,
  TAKE,
  PUT,
  go,
  wrapWritableStream,
  takeOrThrow,
  putMany
};
