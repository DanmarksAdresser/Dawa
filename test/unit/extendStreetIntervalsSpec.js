"use strict";

const expect = require('chai').expect;

const databaseTypes = require('../../psql/databaseTypes');
const extendStreetIntervals = require('../../history/extendStreetIntervals');

const Husnr = databaseTypes.Husnr;
const Range = databaseTypes.Range;

const refify = postnrInterval => postnrInterval.nr;
const unrefify = ref =>({ nr: ref});

const boxify = interval => extendStreetIntervals.internal.boxify(interval, refify);
const unboxify = box => extendStreetIntervals.internal.unboxify(box, unrefify);
const extend = intervals => extendStreetIntervals(intervals, refify, unrefify);

const aInterval = {
  virkningstart: '2015-01-01T00:00:00Z',
  virkningslut: '2016-01-01T00:00:00.123Z',
  husnrstart: {
    tal: 1,
    bogstav: 'B'
  },
  husnrslut: {
    tal: 2,
    bogstav: 'C'
  },
  nr: 8000
};

const anotherInterval = {
  virkningstart: '2014-01-01T00:00:00Z',
  virkningslut: '2017-01-01T00:00:00.123Z',
  husnrstart: null,
  husnrslut: null,
  nr: 9000
};

describe('husnrComparator', () => {
  var husnrComparator = extendStreetIntervals.internal.husnrComparator;
  it('1A is before 1B', () => {
    expect(husnrComparator({tal: 1, bogstav: 'A'}, {tal: 1, bogstav: 'B'})).to.be.below(0);
  });
});

describe('ensureNotOverlapping', () => {
  it('Should work for two boxes', () => {
    const boxes = [anotherInterval, aInterval].map(boxify);
    const result = extendStreetIntervals.internal.ensureNotOverlapping(boxes);
    result.sort(extendStreetIntervals.internal.outputComparator);
    const resultIntervals = result.map(unboxify);
    expect(resultIntervals).to.deep.equal(
      [
        {
          "nr": 9000,
          "virkning": new Range("2014-01-01T00:00:00.000+00:00", "2015-01-01T00:00:00.000+00:00", '[)'),
          "husnrinterval": new Range(null, null, '()')
        },
        {
          "nr": 9000,
          "virkning": new Range("2015-01-01T00:00:00.000+00:00", "2016-01-01T00:00:00.123+00:00", '[)'),
          "husnrinterval": new Range(null, new Husnr(1, "B"), '()')
        },
        {
          "nr": 8000,
          "virkning": new Range("2015-01-01T00:00:00.000+00:00", "2016-01-01T00:00:00.123+00:00", '[)'),
          "husnrinterval": new Range(new Husnr(1, "B"), new Husnr(2, "C"), '[]')
        },
        {
          "nr": 9000,
          "virkning": new Range("2015-01-01T00:00:00.000+00:00","2016-01-01T00:00:00.123+00:00", '[)'),
          "husnrinterval": new Range(new Husnr(2, 'C'), null, '()')
        },
        {
          "nr": 9000,
          "virkning": new Range("2016-01-01T00:00:00.123+00:00", "2017-01-01T00:00:00.123+00:00", '[)'),
          "husnrinterval": new Range(null, null, '()')
        }
      ]
    );
  });
});

describe('extendStreetIntervals', () => {

  it('A single interval will simply be extended in both directions', () => {
    const result = extend([aInterval]);
    expect(result).to.deep.equal([
      {
        nr: 8000,
        virkning: new Range(null, null, '[)'),
        husnrinterval: new Range(new Husnr(1, 'B'), new Husnr(2, 'C'), '[]')
      }
    ]);
  });

  it('An box completely contained in an infinite husnr interval will not be extended', () => {
    const result = extend([anotherInterval, aInterval]);
    expect(result).to.deep.equal([
      {
        "nr": 9000,
        "virkning": new Range(null, "2015-01-01T00:00:00.000+00:00", '()'),
        "husnrinterval": new Range(null, null, '()')
      },
      {
        "nr": 9000,
        "virkning": new Range("2015-01-01T00:00:00.000+00:00", "2016-01-01T00:00:00.123+00:00", '[)'),
        "husnrinterval": new Range(null, new Husnr(1, "B"), '()')
      },
      {
        "nr": 8000,
        "virkning": new Range("2015-01-01T00:00:00.000+00:00", "2016-01-01T00:00:00.123+00:00", '[)'),
        "husnrinterval": new Range(new Husnr(1, "B"), new Husnr(2, "C"), '[]')
      },
      {
        "nr": 9000,
        "virkning": new Range("2015-01-01T00:00:00.000+00:00", "2016-01-01T00:00:00.123+00:00", '[)'),
        "husnrinterval": new Range(new Husnr(2, "C"), null, '()')
      },
      {
        "nr": 9000,
        "virkning": new Range("2016-01-01T00:00:00.123+00:00", null, '[)'),
        "husnrinterval": new Range(null, null, '()')
      }
    ]);
  });
});