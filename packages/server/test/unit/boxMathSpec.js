"use strict";

const expect = require('chai').expect;

const boxMath = require('../../boxMath');

const box = {
  xInterval: {
    min: 0,
    max: 1,
    minInclusive: true,
    maxInclusive: false
  },
  yInterval: {
    min: 0,
    max: 1,
    minInclusive: true,
    maxInclusive: false
  },
  ref: "box"
};

const boxClone = {
  xInterval: {
    min: 0,
    max: 1,
    minInclusive: true,
    maxInclusive: false
  },
  yInterval: {
    min: 0,
    max: 1,
    minInclusive: true,
    maxInclusive: false
  },
  ref: "boxClone"
};
const completelyContainingBox = {
  xInterval: {
    min: -1,
    max: 2,
    minInclusive: true,
    maxInclusive: false
  },
  yInterval: {
    min: -1,
    max: 2,
    minInclusive: true,
    maxInclusive: false
  },
  ref: "completelyContaining"
};

const nonOverlappingBox = {
  xInterval: {
    min: 1,
    max: 2,
    minInclusive: true,
    maxInclusive: false
  },
  yInterval: {
    min: 0,
    max: 1,
    minInclusive: true,
    maxInclusive: false
  },
  xmin: 1,
  ymin: 0,
  xmax: 2,
  ymax: 1,
  ref: "nonOverlapping"
}

function numberComparator(a, b) {
  return a - b;
}

const applyNumberBoxes = boxMath(numberComparator, numberComparator).applyBoxes;

describe('Box math', () => {
  it('I can apply an identical box to a box, and get just the box', () => {
    var result = applyNumberBoxes(box, boxClone);
    expect(result).to.deep.equal([boxClone]);
  });

  it('Applying two boxes which does not overlap results in just the two boxes', () => {
    var result = applyNumberBoxes(box, nonOverlappingBox);
    expect(result).to.deep.equal([box, nonOverlappingBox]);
  });

  it('Applying a box completely contained by another box results in the correct outcome', () => {
    var result = applyNumberBoxes(completelyContainingBox, box);
    expect(result).to.deep.equal(
      [box,
        {
          xInterval: {
            min: 0,
            max: 1,
            minInclusive: true,
            maxInclusive: false
          },
          yInterval: {
            min: 1,
            max: 2,
            minInclusive: true,
            maxInclusive: false
          },
          ref: "completelyContaining"
        }, // top box
        {
          xInterval: {
            min: 0,
            max: 1,
            minInclusive: true,
            maxInclusive: false
          },
          yInterval: {
            min: -1,
            max: 0,
            minInclusive: true,
            maxInclusive: false
          },
          ref: "completelyContaining"
        }, // bottom box
        {
          xInterval: {
            min: 1,
            max: 2,
            minInclusive: true,
            maxInclusive: false
          },
          yInterval: {
            min: -1,
            max: 2,
            minInclusive: true,
            maxInclusive: false
          },
          ref: "completelyContaining"
        }, // right box
        {
          xInterval: {
            min: -1,
            max: 0,
            minInclusive: true,
            maxInclusive: false
          },
          yInterval: {
            min: -1,
            max: 2,
            minInclusive: true,
            maxInclusive: false
          },
          ref: "completelyContaining"
        } // left box
      ]
    );
  });
});
