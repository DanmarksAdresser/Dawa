"use strict";

const moment = require('moment');
const _ = require('underscore');

const intervalMath = require('../intervalMath');
const Range = require('../psql/databaseTypes').Range;

function refify(streetNameInterval) {
  return _.pick(streetNameInterval, 'navn', 'adresseringsnavn');
}

function unrefify(interval) {
  return _.clone(interval.ref);
}

function inclusive(i) {
  return (i.minInclusive ? '[' : '(') + (i.maxInclusive ? ']' : ')');
}

module.exports = function(street) {
  const streetNameIntervals = street.intervals;
  const intervals = streetNameIntervals.map((streetName) => {
    const min = streetName.virkningstart ? moment(streetName.virkningstart).valueOf() : Number.NEGATIVE_INFINITY;
    const max = streetName.virkningslut ? moment(streetName.virkningslut).valueOf() : Number.POSITIVE_INFINITY;
    return {
      min: min,
      max: max,
      minInclusive: min !== Number.NEGATIVE_INFINITY,
      maxInclusive: false,
      ref: refify(streetName)
    }
  });
  const extendedIntervals = intervalMath.extend(intervals, intervalMath.valueMath.numberComparator);
  const result = extendedIntervals.map((interval) => {
    const virkningstart = interval.min === Number.NEGATIVE_INFINITY ? null : moment.tz(interval.min, 'utc').format('YYYY-MM-DDTHH:mm:ss.SSSZ');
    const virkningslut = interval.max === Number.POSITIVE_INFINITY ? null : moment.tz(interval.max, 'utc').format('YYYY-MM-DDTHH:mm:ss.SSSZ');
    const virkningInclusive = inclusive(interval);
    const result = unrefify(interval);
    result.virkning = new Range(virkningstart, virkningslut, virkningInclusive);
    result.kommunekode = street.kommunekode;
    result.vejkode = street.vejkode;
    return result;
  });

  return result;
};