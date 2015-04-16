"use strict";

var q = require('q');
var _ = require('underscore');

exports.mapSerial = function(arr, fn) {
  var promises = [];
  var tasks = _.map(arr, function(value, key) {
    return function() {
      var promise = fn(value, key);
      promises.push(promise);
      return promise;
    };
  });
  return tasks.reduce(q.when, q({})).then(function() {
    return q.all(promises);
  });
};

exports.reduce = function(arr, fn, initial) {
  var tasks = arr.map(function(item) {
    return function(memo) {
      return q.when(memo).then(function(memo) {
        return fn(memo, item);
      });
    };
  });
  return tasks.reduce(q.when, initial);
};

exports.awhile = function(cond, body) {
  return q.Promise(function(resolve, reject) {
    if(!cond()) {
      return resolve();
    }
    q.when(body(), exports.awhile, reject);
  });
};