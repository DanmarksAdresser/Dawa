"use strict";

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

// note: ref is taken from b
function boxIntersection(a, b, xComparator, yComparator) {
  const xInterval = intervalIntersection(a.xInterval, b.xInterval, xComparator);
  const yInterval = intervalIntersection(a.yInterval, b.yInterval, yComparator);
  if(xInterval && yInterval) {
    return {
      xInterval: xInterval,
      yInterval: yInterval,
      ref: b.ref
    }
  }
  return null;
}

function boxOverlaps(a, b, xComparator, yComparator) {
  return boxIntersection(a, b, xComparator, yComparator) !== null;
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

function isVerticalMergable(a, b, xComparator, yComparator) {
  return isAdjacent(a.yInterval, b.yInterval, yComparator) &&
    intervalsEqual(a.xInterval, b.xInterval, xComparator) &&
    a.ref === b.ref;
}

function isHorizontalMergeable(a, b, xComparator, yComparator) {
  return isAdjacent(a.xInterval, b.xInterval, xComparator) &&
      intervalsEqual(a.yInterval, b.yInterval, yComparator) &&
      a.ref === b.ref;
}

function mergeVerticallyAdjacent(a, b, yComparator) {
  return {
    xInterval: a.xInterval,
    yInterval: mergeAdjacentIntervals(a.yInterval, b.yInterval, yComparator),
    ref: a.ref
  }
}

function mergeHorizontallyAdjacent(a, b, xComparator) {
  return {
    xInterval: mergeAdjacentIntervals(a.xInterval, b.xInterval, xComparator),
    yInterval: a.yInterval,
    ref: a.ref
  };
}


// computes a set of non-overlapping boxes from two boxes. B wins if the boxes overlaps.
function applyBoxes(a,b, xComparator, yComparator) {

  const intersection = boxIntersection(a, b, xComparator, yComparator);
  if(!intersection) {
    return [a, b];
  }

  const result = [intersection];

  // compute box above intersection
  const aTop = right(a.yInterval, b.yInterval, yComparator);
  const bTop = right(b.yInterval, a.yInterval, yComparator);
  if(aTop) {
    result.push({
      xInterval: intersection.xInterval,
      yInterval: aTop,
      ref: a.ref
    });
  }
  else if (bTop) {
    result.push({
      xInterval: intersection.xInterval,
      yInterval: bTop,
      ref: b.ref
    });
  }

  // compute box below intersection
  const aBottom = left(a.yInterval, b.yInterval, yComparator);
  const bBottom = left(b.yInterval, a.yInterval, yComparator);
  if(aBottom) {
    result.push({
      xInterval: intersection.xInterval,
      yInterval: aBottom,
      ref: a.ref
    });
  }
  else if(bBottom) {
    result.push({
      xInterval: intersection.xInterval,
      yInterval: bBottom,
      ref: b.ref
    });
  }

  // compute box to the right of the intersection
  const aRight = right(a.xInterval, b.xInterval, xComparator);
  const bRight = right(b.xInterval, a.xInterval, xComparator);
  if(aRight) {
    result.push({
      xInterval: aRight,
      yInterval: a.yInterval,
      ref: a.ref
    });
  }
  else if(bRight) {
    result.push({
      xInterval: bRight,
      yInterval: b.yInterval,
      ref: b.ref
    });
  }

  // compute box to the left of the intersection
  const aLeft = left(a.xInterval, b.xInterval, xComparator);
  const bLeft = left(b.xInterval, a.xInterval, xComparator);
  if(aLeft) {
    result.push({
      xInterval: aLeft,
      yInterval: a.yInterval,
      ref: a.ref
    });
  }
  else if(bLeft) {
    result.push({
      xInterval: bLeft,
      yInterval: b.yInterval,
      ref: b.ref
    });
  }

  /*eslint no-constant-condition: 0*/
  merge: while(true) {
    for(let a of result) {
      for(let b of result) {
        if(isVerticalMergable(a, b, xComparator, yComparator)) {
          result.splice(result.indexOf(a), 1);
          result.splice(result.indexOf(b), 1);
          result.push(mergeVerticallyAdjacent(a, b, yComparator));
          continue merge;
        }
        if(isHorizontalMergeable(a, b, xComparator, yComparator)) {
          result.splice(result.indexOf(a), 1);
          result.splice(result.indexOf(b), 1);
          result.push(mergeHorizontallyAdjacent(a, b, xComparator));
          continue merge;
        }
      }
    }
    break;
  }

  return result;
}

module.exports = function(xComparator, yComparator) {
  return {
    applyBoxes: (a, b) => applyBoxes(a, b, xComparator, yComparator),
    overlaps: (a, b) => boxOverlaps(a, b, xComparator, yComparator)
  };
};
