"use strict";

var MA = require('moving-average');
var _ = require('underscore');

var logger = require('@dawadk/common/src/logger');
exports.stats = {};

exports.emit = function(type, value, err, meta) {
  if(!meta) {
    meta = {};
  }
  meta.type = type;
  meta.value = value;
  if(err) {
    meta.error = err;
  }
  if(err) {
    logger.info('stat_error', 'measured', meta);
  }
  else {
    logger.info('stat', 'measured', meta);
  }
  var now = Date.now();
  if(!exports.stats[type]) {
    exports.stats[type] = {
      ma1m: MA(60 * 1000),
      ma1h: MA(60 * 60 * 1000),
      ma1m_error: MA(60 * 1000),
      ma1h_error: MA(60 * 60 * 1000)
    };
  }
  var stat = exports.stats[type];
  if(value) {
    stat.lastTime = now;
    stat.lastValue = value;
    stat.ma1m.push(now, value);
    stat.ma1h.push(now, value);
  }
  if(err) {
    stat.lastErrorTime = now;
  }
  var errval = err ? 0 : 1;
  stat.ma1m_error.push(now, errval);
  stat.ma1h_error.push(now, errval);
};

exports.getStatistics = function() {
  return _.reduce(exports.stats, function(memo, stat, key) {
    memo[key] = {
      lastTime: new Date(stat.lastTime).toISOString(),
      lastValue: stat.lastValue,
      lastErrorTime: stat.lastErrorTime ? new Date(stat.lastErrorTime).toISOString() : undefined
    };
    ['ma1m', 'ma1h'].forEach(function(ma) {
      memo[key][ma] = {
        movingAverage: stat[ma].movingAverage(),
        variance: stat[ma].variance()
      };
    });
    return memo;
  }, {});
};
