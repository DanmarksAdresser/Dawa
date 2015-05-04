"use strict";

var expect = require('chai').expect;

var csvSpecUtil = require('../../darImport/csvSpecUtil');
var types = require('../../darImport/csvTypes');

var transformCsv = csvSpecUtil.transformCsv;
var transform = csvSpecUtil.transform;

describe('csvSpecUtil', function() {
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

    var csvTransformedRow;

    beforeEach(function() {
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
      csvTransformedRow = transformCsv(spec, sampleRow);
    });


    it('Should transform a valid UUID field unmodified', function() {
      expect(csvTransformedRow.id).to.equal('e132a6f0-d06f-41a3-abd8-00035e7ab4cd');
    });
    it('Should transform an integer field by parsing it', function() {
      expect(csvTransformedRow.statuskode).to.equal(5);
    });
    it('Should parse a float field by parsing it', function() {
      expect(csvTransformedRow.nord).to.equal(6190946.37);
    });
    it('Should parse a timestamp into the appropriate ISO UTC timestamp', function() {
      expect(csvTransformedRow.revisionsdato).to.equal('2010-07-05T10:16:15.690Z');
    });
    it('Should parse virkningstart og virkningslut into an interval', function() {
      expect(transform(spec, csvTransformedRow).virkning).to.deep.equal('["2008-07-05T10:16:15.690Z","2010-07-05T10:16:15.690Z")');
    });
    it('Should parse registreringstart og registreringslut into an interval', function() {
      expect(transform(spec, csvTransformedRow).registrering).to.deep.equal('["2008-07-05T10:16:15.690Z",)');
    });
    it('Should parse null and undefined values', function() {
      var sample = {
        nord: undefined,
        statuskode: null
      };
      var result = transformCsv(spec, sample);
      expect(result.nord).to.be.null;
      expect(result.statuskode).to.be.null;
    });
  });
});
