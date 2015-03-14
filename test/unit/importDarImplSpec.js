"use strict";

var expect = require('chai').expect;

var importDarImpl = require('../../darImport/importDarImpl');

var transform = importDarImpl.internal.transform;
var types = importDarImpl.internal.types;

describe('importDarImpl', function () {
  describe('Parsing of dates', function() {
    it('Should parse a date with timezone offset', function() {
      expect(types.timestamp.parse('2008-07-05T12:16:15.690+02:00')).to.equal('2008-07-05T10:16:15.690Z');
    });
    it('Should parse a date in zulu time', function() {
      expect(types.timestamp.parse('2008-07-05T10:16:15.690Z')).to.equal('2008-07-05T10:16:15.690Z');
    });
    it('Should parse dates without full millisecond precision', function() {
      expect(types.timestamp.parse('2008-07-05T10:16:15.69Z')).to.equal('2008-07-05T10:16:15.690Z');
      expect(types.timestamp.parse('2008-07-05T10:16:15.6Z')).to.equal('2008-07-05T10:16:15.600Z');
      expect(types.timestamp.parse('2008-07-05T10:16:15Z')).to.equal('2008-07-05T10:16:15.000Z');
    });
    it('Currently, more than millisecond precision is truncated', function() {
      expect(types.timestamp.parse('2008-07-05T10:16:15.69012Z')).to.equal('2008-07-05T10:16:15.690Z');
    });
  });
  describe('Transformation of CSV values', function () {
    var spec = {
      bitemporal: true,
      idColumns: ['id'],
      columns: [
        {
          name: 'id',
          type: types.uuid
        },
        {
          name: 'statuskode',
          type: types.integer
        },
        {
          name: 'nord',
          type: types.float
        },
        {
          name: 'tekniskstandard',
          type: types.string
        },
        {
          name: 'revisionsdato',
          type: types.timestamp
        }]
    };

    var sampleRow = {
      id: 'e132a6f0-d06f-41a3-abd8-00035e7ab4cd',
      statuskode: '5',
      nord: '6190946.37',
      tekniskstandard: 'FU',
      revisionsdato: '2010-07-05T12:16:15.690+02:00',
      virkningstart: '2008-07-05T12:16:15.690+02:00',
      virkningslut: '2010-07-05T12:16:15.690+02:00',
      registreringstart: '2008-07-05T12:16:15.690+02:00',
      registreringslut: null
    };

    it('Should transform a valid UUID field unmodified', function() {
      expect(transform(spec, sampleRow).id).to.equal('e132a6f0-d06f-41a3-abd8-00035e7ab4cd');
    });
    it('Should transform an integer field by parsing it', function() {
      expect(transform(spec, sampleRow).statuskode).to.equal(5);
    });
    it('Should parse a float field by parsing it', function() {
      expect(transform(spec, sampleRow).nord).to.equal(6190946.37);
    });
    it('Should parse a timestamp into the appropriate ISO UTC timestamp', function() {
      expect(transform(spec, sampleRow).revisionsdato).to.equal('2010-07-05T10:16:15.690Z');
    });
    it('Should parse virkningstart og virkningslut into an interval', function() {
      expect(transform(spec, sampleRow).virkning).to.deep.equal('["2008-07-05T10:16:15.690Z","2010-07-05T10:16:15.690Z")');
    });
    it('Should parse registreringstart og registreringslut into an interval', function() {
      expect(transform(spec, sampleRow).registrering).to.deep.equal('["2008-07-05T10:16:15.690Z",)');
    });
    it('Should parse null and undefined values', function() {
      var sample = {
        nord: undefined,
        statuskode: null
      };
      var result = transform(spec, sample);
      expect(result.nord).to.be.null;
      expect(result.statuskode).to.be.null;
    });
  });
});