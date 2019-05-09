"use strict";

const { go, Signal, OperationType, CLOSED } = require('ts-csp');

const mapAsync = function(arr, mapFn) {
  return go(function*() {
    const result = [];
    for(let item of arr) {
      result.push(yield this.delegateAbort(mapFn(item)));
    }
    return result;
  });
};

const reduceAsync = function(arr, reduceFn, acc) {
  return go(function*() {
    for(let item of arr) {
      acc = yield this.delegateAbort(reduceFn(acc, item));
    }
    return acc;
  });
};

const mapObjectAsync = function(obj, mapFn) {
  return go(function*() {
    const result = {};
    for(let key of Object.keys(obj)) {
      result[key] = yield this.delegateAbort(mapFn(obj[key], key));
    }
    return result;
  });
};

const processify = processOrPromise => {
  if(processOrPromise.abort instanceof Signal) {
    return processOrPromise;
  }
  return go(function*() {
    return yield processOrPromise;
  });
};

const pipe = (src, dst, batchSize) => {
  return go(function*() {
    /* eslint no-constant-condition: 0 */
    while(true) {
      const { values } = yield this.selectOrAbort(
        [{ch: src, op: OperationType.TAKE_MANY, count: batchSize}]);
      const closed = values[values.length -1] === CLOSED;
      if(closed) {
        values.pop();
      }
      if(values.length > 0) {
        yield this.selectOrAbort([{
          ch: dst,
          op: OperationType.PUT_MANY,
          values
        }]);
      }
      if(closed) {
        dst.close();
        return;
      }
    }
  });
};

const pipeFromStream = (stream, dst, batchSize) => {
  const errorSignal = new Signal();
  stream.on('error', error => errorSignal.raise(error));
  const endSignal = new Signal();
  stream.on('end', () => endSignal.raise());
  batchSize = batchSize || 1;
  return go(function*() {
    let values = [];
    let batchComplete = new Signal();
    const dataListener = (data) => {
      values.push(data);
      if(values.length >= batchSize) {
        batchComplete.raise(null);
        stream.pause();
      }
    };
    stream.on('data', dataListener);
    try {
      /* eslint no-constant-condition: 0 */
      while(true) {
        const { ch, value } = yield this.selectOrAbort([
          { ch: errorSignal, op: OperationType.TAKE },
          { ch: endSignal, op: OperationType.TAKE },
          { ch: batchComplete, op: OperationType.TAKE }
        ]);
        if(ch === errorSignal) {
          throw value;
        }
        if(ch === endSignal) {
          dst.putManySync(values);
          values = [];
          dst.close();
          break;
        }
        const valuesCopy = values;
        values = [];
        batchComplete = new Signal();
        stream.resume();
        yield this.selectOrAbort([
          { ch: dst, op: OperationType.PUT_MANY, values: valuesCopy }
        ]);
      }
    }
    finally {
      stream.removeListener('data', dataListener);
    }
  });
};

const pipeToStream = (src, stream, batchSize, initialDataSignal) => {
  const errorSignal = new Signal();
  let wantMoreDataSignal = new Signal();
  stream.on('drain', () => wantMoreDataSignal.raise());
  if(typeof stream.socket !=='undefined') {
    if(!stream.socket || stream.socket.destroyed) {
      errorSignal.raise(new Error('Client closed connection'));
    }
  }
  else {
    stream.once('error', (err) => errorSignal.raise(err));
    stream.once('close', (err) => errorSignal.raise(err));
  }
  return go(function*() {
    while(true) {/* eslint no-constant-condition: 0 */
      const takeResult = yield this.selectOrAbort([
        { ch: errorSignal, op: OperationType.TAKE },
        { ch: src, op: OperationType.TAKE_MANY, count: batchSize }
      ]);
      if (initialDataSignal) {
        initialDataSignal.raise();
      }
      if(takeResult.ch === errorSignal) {
        throw new Error('stream emitted an error: ' + errorSignal.value());
      }
      const values = takeResult.values;
      const closed = values[values.length - 1] === CLOSED;
      if(closed) {
        values.splice(values.length - 1, 1);
      }
      let writeResult;

      for(let value of values) {
        writeResult = stream.write(value);
      }
      if(closed) {
        const finishSignal = new Signal();
        stream.once('finish', () => finishSignal.raise(null));
        stream.end();
        const waitResult =  yield this.selectOrAbort([
          { ch: errorSignal, op: OperationType.TAKE },
          { ch: finishSignal, op: OperationType.TAKE }
        ]);
        if(waitResult.ch === errorSignal) {
          throw new Error('stream emitted an error');
        }
        return;
      }
      else if(!writeResult) {
        wantMoreDataSignal = new Signal();
        const waitResult =  yield this.selectOrAbort([
          { ch: errorSignal, op: OperationType.TAKE },
          { ch: wantMoreDataSignal, op: OperationType.TAKE }
        ]);
        if(waitResult.ch === errorSignal) {
          throw new Error('stream emitted an error');
        }
      }
    }
  });
};

const sleep = ms => go(function*() {
  const signal = new Signal();
  const timeoutId = setTimeout(() => signal.raise(), ms);
  try {
    yield this.takeOrAbort(signal);
  }
  finally {
    clearTimeout(timeoutId);
  }
});

const takeWithTimeout = (ms, src, errFactory) => go(function*() {
  errFactory = errFactory || (() => new Error('Timeout'));
  const sleeperProcess = sleep(ms);
  try {
    const selectResult = yield this.selectOrAbort([
      {ch: sleeperProcess.succeeded, op: OperationType.TAKE },
      {ch: src, op: OperationType.TAKE }
    ]);
    if(selectResult.ch === sleeperProcess.succeeded) {
      throw errFactory();
    }
    else {
      return selectResult.value;
    }
  }
  finally {
    sleeperProcess.abort.raise();
  }
});

const channelEvents = (eventEmitter, eventName, channel) => go(function*() {
    const handler = event => {
      channel.putSync(event);
    };
    eventEmitter.on(eventName, handler);
    yield this.abortSignal.take();
    eventEmitter.removeListener(eventName, handler);
  }
);

const pipeMapAsync = (src, dst, batchSize, asyncMapFn) => go(function*() {
  while(true) {
    const { values } = yield this.selectOrAbort(
      [{ch: src, op: OperationType.TAKE_MANY, count: batchSize}]);
    const closed = values[values.length -1] === CLOSED;
    if(closed) {
      values.pop();
    }
    const mappedValues = yield this.delegateAbort(mapAsync(values, asyncMapFn));
    if(mappedValues.length > 0) {
      yield dst.putMany(mappedValues);
    }
    if(closed) {
      dst.close();
      return;
    }
  }
});

const waitUntil = (pred, timeout) => go(function*() {
  const before = Date.now();
  while(Date.now() <= before + timeout) {
    const result = yield pred();
    if(result) {
      return result;
    }
  }
  throw new Error('Timeout');
});

module.exports = {
  pipeMapAsync,
  mapAsync,
  reduceAsync,
  mapObjectAsync,
  processify,
  pipe,
  pipeToStream,
  pipeFromStream,
  sleep,
  channelEvents,
  takeWithTimeout,
  waitUntil
};
