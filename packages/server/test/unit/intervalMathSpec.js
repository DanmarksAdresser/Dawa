"use strict";

const expect = require('chai').expect;

const intervalMath = require('../../intervalMath');

const aInterval = () => ({
  min: 0,
  max: 1,
  minInclusive: true,
  maxInclusive: true,
  ref: 'a'
});

const contained = () => ({
  min: 0,
  max: 1,
  minInclusive: false,
  maxInclusive: false,
  ref: 'contained'
});

const nonOverlapping = () => ({
  min: 2,
  max: 3,
  minInclusive: true,
  maxInclusive: true,
  ref: 'nonOverlapping'
});

const overlapping = () => ({
  min: 0.5,
  max: 1.5,
  minInclusive: true,
  maxInclusive: true,
  ref: 'overlapping'
});

const comparator = intervalMath.valueMath.numberComparator;

describe('Interval math', () => {
  describe('right', () => {
    it('Should work for infinite intervals', () => {
      const intervals =[
        {
          "min": Number.NEGATIVE_INFINITY,
          "max": Number.POSITIVE_INFINITY,
          "maxInclusive": false,
          "minInclusive": false,
          "ref": "a"
        },
        {
          "min": Number.NEGATIVE_INFINITY,
          "max": 1,
          "minInclusive": false,
          "maxInclusive": false,
          "ref": "b"
        }];
      const result = intervalMath.right(intervals[0], intervals[1], comparator);
      expect(result).to.deep.equal({
        min: 1,
        max: Number.POSITIVE_INFINITY,
        minInclusive: true,
        maxInclusive: false
      });
    });
  });

  describe('applyIntervals', () => {
    it('Applying two non-overlapping intervals should result in the same two intervals', () => {
      const result = intervalMath.applyIntervals(aInterval(), nonOverlapping(), comparator);
      expect(result)
        .to.deep.equal([nonOverlapping(), aInterval()]);
    });

    it('Applying two overlapping intervals should result in two intervals, and the second should be unchanged', () => {
      expect(intervalMath.applyIntervals(aInterval(), overlapping(), comparator)).to.deep.equal(
        [
          {
            "max": 1.5,
            "maxInclusive": true,
            "min": 0.5,
            "minInclusive": true,
            "ref": 'overlapping'
          },
          {
            "max": 0.5,
            "maxInclusive": false,
            "min": 0,
            "minInclusive": true,
            "ref": "a"
          }
        ]);
    });

    it('Applying an interval contained in another interval results in the correct three intervals', () => {
      const result = intervalMath.applyIntervals(aInterval(), contained(), comparator);
      expect(result).to.deep.equal(
        [ { min: 0,
          max: 1,
          minInclusive: false,
          maxInclusive: false,
          ref: 'contained' },
          { min: 0,
            minInclusive: true,
            max: 0,
            maxInclusive: true,
            ref: 'a' },
          { min: 1,
            max: 1,
            maxInclusive: true,
            minInclusive: true,
            ref: 'a' } ]

      );

    });

    it('applying two left-infinite intervals results in the correct result', () => {
       const intervals =[
        {
          "min": Number.NEGATIVE_INFINITY,
          "max": Number.POSITIVE_INFINITY,
          "maxInclusive": false,
          "minInclusive": false,
          "ref": "a"
        },
        {
          "min": Number.NEGATIVE_INFINITY,
          "max": 1,
          "minInclusive": false,
          "maxInclusive": false,
          "ref": "b"
        }];

      const result = intervalMath.applyIntervals(intervals[0], intervals[1], comparator);
      expect(result).to.deep.equal([
        {
          "min": Number.NEGATIVE_INFINITY,
          "max": 1,
          "minInclusive": false,
          "maxInclusive": false,
          "ref": "b"
        },
        {
          "min": 1,
          "max": Number.POSITIVE_INFINITY,
          "minInclusive": true,
          "maxInclusive": false,
          "ref": "a"
        }]);
    });
  });

  describe('extend', () => {
    it('Extending a single interval results in an infinite interval', () => {
      expect(intervalMath.extend([aInterval()], comparator)).to.deep.equal([{
        min: Number.NEGATIVE_INFINITY,
        max: Number.POSITIVE_INFINITY,
        minInclusive: false,
        maxInclusive: false,
        ref: 'a'
      }]);
    });

    it('extending two intervals where one is completely contained in the other results in the ' +
      'epected three intervals', () => {
      var result = intervalMath.extend([aInterval(), contained()], comparator);
      expect(result).to.deep.equal(
        [{
          min: -Infinity,
          minInclusive: false,
          max: 0,
          maxInclusive: true,
          ref: 'a'
        },
          {
            min: 0,
            minInclusive: false,
            max: 1,
            maxInclusive: false,
            ref: 'contained'
          },
          {
            min: 1,
            max: Infinity,
            maxInclusive: false,
            minInclusive: true,
            ref: 'a'
          }]
      );
    });
  });

});