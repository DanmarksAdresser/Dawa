"use strict";

const intervalMath = require('./intervalMath');

// note: ref is taken from b
function boxIntersection(a, b, xComparator, yComparator) {
  const xInterval = intervalMath.intersection(a.xInterval, b.xInterval, xComparator);
  const yInterval = intervalMath.intersection(a.yInterval, b.yInterval, yComparator);
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


function isVerticalMergable(a, b, xComparator, yComparator) {
  return intervalMath.adjacent(a.yInterval, b.yInterval, yComparator) &&
    intervalMath.equals(a.xInterval, b.xInterval, xComparator) &&
    a.ref === b.ref;
}

function isHorizontalMergeable(a, b, xComparator, yComparator) {
  return intervalMath.adjacent(a.xInterval, b.xInterval, xComparator) &&
      intervalMath.equals(a.yInterval, b.yInterval, yComparator) &&
      a.ref === b.ref;
}

function mergeVerticallyAdjacent(a, b, yComparator) {
  return {
    xInterval: a.xInterval,
    yInterval: intervalMath.mergeAdjacent(a.yInterval, b.yInterval, yComparator),
    ref: a.ref
  }
}

function mergeHorizontallyAdjacent(a, b, xComparator) {
  return {
    xInterval: intervalMath.mergeAdjacent(a.xInterval, b.xInterval, xComparator),
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
  const aTop = intervalMath.right(a.yInterval, b.yInterval, yComparator);
  const bTop = intervalMath.right(b.yInterval, a.yInterval, yComparator);
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
  const aBottom = intervalMath.left(a.yInterval, b.yInterval, yComparator);
  const bBottom = intervalMath.left(b.yInterval, a.yInterval, yComparator);
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
  const aRight = intervalMath.right(a.xInterval, b.xInterval, xComparator);
  const bRight = intervalMath.right(b.xInterval, a.xInterval, xComparator);
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
  const aLeft = intervalMath.left(a.xInterval, b.xInterval, xComparator);
  const bLeft = intervalMath.left(b.xInterval, a.xInterval, xComparator);
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
