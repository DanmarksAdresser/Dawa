const assert = require('assert');

module.exports = (dispatchFn, keyFn) => {
  keyFn = keyFn || (x => x);
  const dispatchMap = new Map();
  let defaultDispatch = null;
  const callFn = (...arguments) => {
     const value = dispatchFn.apply(null, arguments);
     const key = keyFn(value);
     assert(dispatchMap.has(key) || defaultDispatch, `Cannot dispatch value, no method registered for dispatch value ${JSON.stringify(value)}`);
     if(!dispatchMap.has(key)) {
       return defaultDispatch.apply(null, arguments);
     }
     else {
       const fn = dispatchMap.get(key);
       return fn.apply(null, arguments);
     }
  };

  callFn.method = (value, fn) => {
    const key = keyFn(value);
    assert(!dispatchMap.has(key), 'Method for dispatch value already defined');
    dispatchMap.set(key, fn);
  };

  callFn.defaultMethod = fn => {
    assert(defaultDispatch === null, 'Cannont override default method');
    defaultDispatch = fn;
  };

  return callFn;
};