"use strict";

const moment = require('moment-timezone');

const databaseTypes = require('@dawadk/common/src/postgres/types');
const boxMath = require('../boxMath')(numberComparator, husnrComparator);

const applyBoxes = boxMath.applyBoxes;
const boxOverlaps = boxMath.overlaps;
const Husnr = databaseTypes.Husnr;
const Range = databaseTypes.Range;

const MINUS_INFINITY = Number.NEGATIVE_INFINITY;
const INFINITY = Number.POSITIVE_INFINITY;

function husnrComparator(a, b) {
  if(a === b) {
    return 0;
  }
  if(a === MINUS_INFINITY || b === INFINITY) {
    return -1;
  }
  if(a === INFINITY || b === MINUS_INFINITY) {
    return 1;
  }
  if(a.tal !== b.tal) {
    return  a.tal - b.tal;
  }
  if(a.bogstav === b.bogstav) {
    return 0;
  }
  if(!a.bogstav) {
    return -1;
  }
  if (!b.bogstav) {
    return 1;
  }
  if(a.bogstav < b.bogstav) {
    return -1;
  }
  return 1;
}

function numberComparator(a, b) {
  if(a === b) {
    return 0;
  }
  if(a === MINUS_INFINITY || b === INFINITY) {
    return -1;
  }
  if(a === INFINITY || b === MINUS_INFINITY) {
    return 1;
  }
  return a - b;
}

function ensureNotOverlapping(boxes) {
  if(boxes.length <= 1) {
    return boxes;
  }
  const result = [boxes.shift()];
  for(const box of boxes) {
    const pendingBoxes = [box];
    while(pendingBoxes.length > 0) {
      const pendingBox = pendingBoxes.pop();
      const overlappingBox = result.find((box) => boxOverlaps(box, pendingBox));
      if(!overlappingBox) {
        result.push(pendingBox);
        continue;
      }
      result.splice(result.indexOf(overlappingBox), 1);
      const newBoxes = applyBoxes(overlappingBox, pendingBox);
      for(const box of newBoxes) {
        pendingBoxes.unshift(box);
      }
    }
  }
  return result;
}

// In CPR, it is (was) permitted to have an infinite interval and
function compareInfs(a, b) {
  function infs(i) {
    let result = 0;
    if(i.min === MINUS_INFINITY) {
      ++result;
    }
    if(i.max === INFINITY) {
      ++result;
    }
    return result;
  }
  return infs(b.yInterval) - infs(a.yInterval);
}

function outputComparator(a, b) {
  if(a.xInterval.min !== b.xInterval.min) {
    return a.xInterval.min - b.xInterval.min;
  }
  if(a.yInterval.min === b.yInterval.min ){
    return 0;
  }
  if(a.yInterval.min === MINUS_INFINITY) {
    return -1;
  }
  if(b.yInterval.min === MINUS_INFINITY) {
    return 1;
  }
  if(a.yInterval.min.tal !== b.yInterval.min.tal){
    return a.yInterval.min.tal - b.yInterval.min.tal;
  }
  if(a.yInterval.min.bogstav < b.yInterval.min.bogstav) {
    return -1;
  }
  else if(a.yInterval.min.bogstav > b.yInterval.min.bogstav) {
    return 1;
  }
  else {
    return 0;
  }
}

function extendStreetIntervals(boxes) {
  boxes.sort(compareInfs);
  boxes = ensureNotOverlapping(boxes);
  // extend all intervals to the left
  boxes.sort((a, b) => {
    if(a.xInterval.min !== b.xInterval.min) {
      return b.xInterval.min - a.xInterval.min;
    }
    // we want the one with MOST infs processed FIRST
    return compareInfs(a, b);
  });
  for(let box of boxes) {
    box.xInterval.min = MINUS_INFINITY;
    box.xInterval.minInclusive = false;
  }
  boxes = ensureNotOverlapping(boxes);

  boxes.sort((a, b) => {
    if(a.xInterval.max !== b.xInterval.max) {
      return a.xInterval.max  - b.xInterval.max;
    }
    // we want the one with MOST infs processed FIRST
    return compareInfs(a, b);
  });
  for(let box of boxes) {
    box.xInterval.max = INFINITY;
    box.xInterval.maxInclusive = false;
  }
  boxes = ensureNotOverlapping(boxes);

  boxes.sort(outputComparator);
  return boxes;
}

function boxify(interval, refify) {
  const ymin = interval.husnrstart ? interval.husnrstart : MINUS_INFINITY;
  const  ymax = interval.husnrslut ? interval.husnrslut : INFINITY;
  const result =  {
    xInterval: {
      min: interval.virkningstart ? moment(interval.virkningstart).valueOf() : MINUS_INFINITY,
      max: interval.virkningslut ? moment(interval.virkningslut).valueOf() : INFINITY,
      minInclusive: interval.virkningstart ? true : false,
      maxInclusive: false
    },
    yInterval: {
      min: ymin,
      max: ymax,
      minInclusive: !!interval.husnrstart,
      maxInclusive: !!interval.husnrslut
    },
    ref: refify(interval)
  };
  return result;
}
function unboxify(box, unrefify) {
  function inclusive(i) {
    return (i.minInclusive ? '[' : '(') + (i.maxInclusive ? ']' : ')');
  }
  const result = unrefify(box.ref);
  const xmin = box.xInterval.min;
  const xmax = box.xInterval.max;
  const ymin = box.yInterval.min;
  const ymax = box.yInterval.max;
  const virkningstart = xmin === MINUS_INFINITY ? null : moment.tz(xmin, 'utc').format('YYYY-MM-DDTHH:mm:ss.SSSZ');
  const virkningslut = xmax === INFINITY ? null : moment.tz(xmax, 'utc').format('YYYY-MM-DDTHH:mm:ss.SSSZ');
  const virkningInclusive = inclusive(box.xInterval);
  const husnrstart = ymin === MINUS_INFINITY ? null : new Husnr(ymin.tal, ymin.bogstav);
  const husnrslut = ymax === INFINITY ? null : new Husnr(ymax.tal, ymax.bogstav);
  const husnrInclusive = inclusive(box.yInterval);
  result.virkning = new Range(virkningstart, virkningslut, virkningInclusive);
  result.husnrinterval = new Range(husnrstart, husnrslut, husnrInclusive);
  return result;
}

module.exports = function(intervals, refify, unrefify) {
  let boxes = intervals.map(interval => boxify(interval, refify));
  boxes = extendStreetIntervals(boxes);
  return boxes.map(box => unboxify(box, unrefify));
};

module.exports.internal = {
  ensureNotOverlapping: ensureNotOverlapping,
  boxify: boxify,
  unboxify: unboxify,
  outputComparator: outputComparator,
  husnrComparator: husnrComparator
};