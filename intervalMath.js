"use strict";

const _ = require('underscore');

const MINUS_INFINITY = Number.NEGATIVE_INFINITY;
const INFINITY = Number.POSITIVE_INFINITY;

function isEmpty(interval, comparator) {
  return comparator(interval.min, interval.max) > 0 ||
    (equals(interval.min, interval.max, comparator) && (!interval.maxInclusive || !interval.minInclusive));
}

function intervalIntersection(a, b, comparator) {
  var result = {
    min: max(a.min, b.min, comparator),
    max: min(a.max, b.max, comparator)
  };
  if(equals(result.min, a.min, comparator) && !a.minInclusive) {
    result.minInclusive = false;
  }
  else if(equals(result.min, b.min, comparator) && !b.minInclusive) {
    result.minInclusive = false;
  }
  else {
    result.minInclusive = true;
  }

  if(equals(result.max, a.max, comparator) && !a.maxInclusive) {
    result.maxInclusive = false;
  }
  else if(equals(result.max, b.max, comparator) && !b.maxInclusive) {
    result.maxInclusive = false;
  }
  else {
    result.maxInclusive = true;
  }
  if(isEmpty(result, comparator)) {
    return null;
  }
  return result;
}

function overlaps(a, b, comparator) {
  return intervalIntersection(a, b, comparator) !== null;
}

// returns the part of interval a that is to the left of b
function left(a, b, comparator) {
  var result = {
    min: a.min,
    minInclusive: a.minInclusive,
    max: min(a.max, b.min, comparator)
  };
  if(equals(result.max, a.max, comparator) && !a.maxInclusive) {
    result.maxInclusive = false;
  }
  else if(equals(result.max, b.min, comparator) && b.minInclusive) {
    result.maxInclusive = false;
  }
  else {
    result.maxInclusive = true;
  }
  if(isEmpty(result, comparator)) {
    return null;
  }
  return result;
}

// return the part of interval a that is to the right of b
function right(a, b, comparator) {
  const result = {
    min: max(a.min, b.max, comparator),
    max: a.max,
    maxInclusive: a.maxInclusive
  };
  if(equals(result.min, a.min, comparator) && !a.minInclusive) {
    result.minInclusive = false;
  }
  else if(equals(result.min,  b.max, comparator) && b.maxInclusive) {
    result.minInclusive = false;
  }
  else {
    result.minInclusive = true;
  }
  if(isEmpty(result, comparator)) {
    return null;
  }
  return result;
}

function max(a, b, comparator) {
  return comparator(a,b) <= 0 ? b : a;
}

function min(a, b, comparator) {
  return comparator(a,b) <= 0 ? a : b;
}

function equals(a, b, comparator) {
  return comparator(a,b) === 0;
}


function isAdjacent(a, b, comparator) {
  return (equals(a.min, b.max, comparator) && (a.minInclusive !== b.maxInclusive)) ||
    (equals(a.max, b.min, comparator) && (a.maxInclusive !== b.minInclusive))
}

function intervalsEqual(a, b, comparator) {
  return equals(a.min, b.min, comparator) &&
    equals(a.max, b.max, comparator) &&
    a.minInclusive === b.minInclusive &&
    a.maxInclusive === b.maxInclusive;
}

function mergeAdjacentIntervals(a, b, comparator) {
  if(equals(a.min, b.max, comparator)) {
    return {
      min: b.min,
      max: a.max,
      minInclusive: b.minInclusive,
      maxInclusive: a.maxInclusive
    };
  }
  else if(equals(a.max, b.min, comparator)) {
    return {
      min: a.min,
      max: b.max,
      minInclusive: a.minInclusive,
      maxInclusive: b.maxInclusive
    };
  }
  else {
    throw new Error('Intervals was not adjacent');
  }
}

function applyIntervals(a, b, comparator) {
  const result = [b];
  const aLeft = left(a, b, comparator);
  const aRight = right(a, b, comparator);

  if(aLeft) {
    aLeft.ref = a.ref;
    result.push(aLeft);
  }
  if(aRight) {
    aRight.ref = a.ref;
    result.push(aRight);
  }
  return result;
}


function sortByLeft(arr, comparator) {
  arr.sort((a, b) => {
    const c = comparator(a.min, b.min);
    if(c === 0) {
      if(a.minInclusive && !b.minInclusive) {
        return 1;
      }
      else if(!a.minInclusive && b.minInclusive) {
        return -1;
      }
      return 0;
    }
    return c;
  });
}
function sortByRight(arr, comparator) {
  arr.sort((a, b) => {
    const c = comparator(a.max, b.max);
    if(c === 0) {
      if(a.maxInclusive && !b.maxInclusive) {
        return -1;
      }
      else if(!a.maxInclusive && b.maxInclusive) {
        return 1;
      }
      return 0;
    }
    return -c;
  });
}

function ensureNotOverlapping(intervals, comparator) {
  if(intervals.length <= 1) {
    return intervals;
  }
  const result = [intervals.shift()];
  for(const interval of intervals) {
    const pendingIntervals = [interval];
    while(pendingIntervals.length > 0) {
      const pendingInterval = pendingIntervals.pop();
      const overlappingInterval = result.find((interval) => overlaps(interval, pendingInterval, comparator));
      if(!overlappingInterval) {
        result.push(pendingInterval);
        continue;
      }
      result.splice(result.indexOf(overlappingInterval), 1);
      const newIntervals = applyIntervals(overlappingInterval, pendingInterval, comparator);
      for(const interval of newIntervals) {
        pendingIntervals.push(interval);
      }
    }
  }

  result.sort((a, b) => {
    return comparator(a.min, b.min);
  });
  const mergedResult = [result.shift()];
  for(let interval of result) {
    const last = mergedResult[mergedResult.length - 1];
    if(isAdjacent(last, interval, comparator) && _.isEqual(last.ref, interval.ref)) {
      mergedResult.pop();
      const mergedInterval = mergeAdjacentIntervals(last, interval, comparator);
      mergedInterval.ref = last.ref;
      mergedResult.push(mergedInterval);
    }
    else {
      mergedResult.push(interval);
    }
  }

  return mergedResult;
}

function extend(intervals, comparator) {
  intervals = ensureNotOverlapping(intervals, comparator);
  sortByRight(intervals, comparator);
  for(const interval of intervals) {
    interval.min = MINUS_INFINITY;
    interval.minInclusive = false;
  }
  intervals = ensureNotOverlapping(intervals, comparator);
  sortByLeft(intervals, comparator);
  for(const interval of intervals) {
    interval.max = INFINITY;
    interval.maxInclusive = false;
  }
  intervals = ensureNotOverlapping(intervals, comparator);
  return intervals;
}


module.exports = {
  valueMath: {
    min: min,
    max: max,
    equals: equals,
    numberComparator: function(a, b) {
      if(a === b) {
        return 0;
      }
      return a - b;
    }
  },
  equals: intervalsEqual,
  intersection: intervalIntersection,
  overlaps: overlaps,
  left: left,
  right: right,
  adjacent: isAdjacent,
  mergeAdjacent: mergeAdjacentIntervals,
  applyIntervals: applyIntervals,
  sortByLeft: sortByLeft,
  sortByRight: sortByRight,
  ensureNotOverlapping: ensureNotOverlapping,
  extend: extend
};