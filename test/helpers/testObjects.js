"use strict";

var databaseTypes = require('../../psql/databaseTypes');
var _ = require('underscore');

var Range = databaseTypes.Range;

var nextVersionId = 1000000;

function generateVersionId() {
  return nextVersionId++;
}

exports.defaultRegistrering = new Range('2011-01-01T12:00:00.123Z', null, '[)');
exports.defaultVirkning = new Range('2011-01-01T12:00:00.123Z', null, '[)');

exports.generateVersionId = generateVersionId;
exports.generate = function(temporality, sample, restrictions) {
  var obj = _.clone(sample);
  _.forEach(restrictions, function(value, key) {
    obj[key] = value;
  });
  if(temporality === 'bitemporal' || temporality === 'monotemporal') {
    if (!obj.registreringstart) {
      obj.registreringstart = exports.defaultRegistrering.lower;
    }
    if(!obj.registreringslut) {
      obj.registreringslut = exports.defaultRegistrering.upper;
    }
    if (!obj.versionid) {
      obj.versionid = generateVersionId();
    }
  }
  if(temporality === 'bitemporal') {
    if(!obj.virkningstart) {
      obj.virkningstart = exports.defaultVirkning.lower;
    }
    if(!obj.virkningslut) {
      obj.virkningslut = exports.defaultVirkning.upper;
    }
  }
  return obj;
};

/**
 * TODO currently only bitemporal test objects are supported.
 * @param temporality
 * @param current
 * @param changes
 * @param time
 * @returns {*[]}
 */
exports.generateUpdate = function(temporality, current, changes, time) {
  var updated = exports.generate(temporality, current, _.extend({
    versionid: undefined,
    registreringstart: time,
    virkningstart: time
  }, changes));
  return exports.generateDelete(temporality, current, time).concat([updated]);
};

exports.generateDelete = function(temporality, current, time) {
  var expired = exports.generate(temporality, current, {
    registreringslut: time
  });
  var historic = exports.generate(temporality, current, {
    versionid: undefined,
    registreringstart: time,
    virkningslut: time
  });
  return [expired, historic];
};