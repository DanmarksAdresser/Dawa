"use strict";

var expect = require('chai').expect;
var moment = require('moment');
var q = require('q');
var _ = require('underscore');

var importFromApiImpl = require('../../darImport/importFromApiImpl');

function isBetween(from, to, stringTs) {
  if(!stringTs) {
    return false;
  }
  var ts = moment(stringTs);
  return !ts.isBefore(from) && !ts.isAfter(to);
}

function advancedMockClient(mockApiData) {
  var fetchCounts = {
    adgangspunkt: 0,
    husnummer: 0,
    adresse: 0
  };

  return {
    getPage: function(baseurl, entityName, from, to) {
      var dataIdx = fetchCounts[entityName]++;
      if(dataIdx >= mockApiData[entityName].length) {
        dataIdx = mockApiData[entityName].length - 1;
      }
      var data = mockApiData[entityName][dataIdx];
      var matchingRecords = _.filter(data, function(record) {
        return isBetween(from, to, record.registreringstart) || isBetween(from, to, record.registreringslut);
      });
      var page = matchingRecords.slice(0, Math.min(3, matchingRecords.length));
      return q(page);
    }
  };
}

function mockImporter(mockApiData) {
  return importFromApiImpl({
    maxDarTxDuration: moment.duration(10, 'milliseconds'),
    maxReturnedRecords: 3,
    darClient: advancedMockClient(mockApiData)
  });
}

var noDataMockImporter = mockImporter({
  adgangspunkt: [[]],
  husnummer: [[]],
  adresse: [[]]
});

describe('API import', function() {
  var baseurl = 'BASE_URL';

  var t1 = moment('2015-01-01T00:00:00.000Z');
  var t2 = moment('2015-01-02T00:00:00.000Z');

  var reg0 = moment('2015-01-01T00:00:00.000Z');
  var reg1 = moment('2015-01-01T01:00:00.000Z');
  var reg2 = moment('2015-01-01T02:00:00.000Z');
  var reg2_1 = moment('2015-01-01T02:00:01.000Z');
  var reg3 = moment('2015-01-01T03:00:00.000Z');
  var reg4 = moment('2015-01-01T04:00:00.000Z');

  it('If a row is created and expired in the same batch, a creation row will be created', function() {

    var sampleChangeset = {
      adgangspunkt: [
        {versionid: 1, registreringstart: reg1.toISOString(), registreringslut: reg2.toISOString()},
        {versionid: 2, registreringstart: reg2.toISOString(), registreringslut: null}],
      husnummer: [],
      adresse: []
    };

    var expectedResult = [
      {
        adgangspunkt: [{versionid: 1, registreringstart: reg1.toISOString(), registreringslut: null}],
        husnummer: [],
        adresse: []
      },
      {
        adgangspunkt: [
          {versionid: 1, registreringstart: reg1.toISOString(), registreringslut: reg2.toISOString()},
          {versionid: 2, registreringstart: reg2.toISOString(), registreringslut: null}
        ],
        husnummer: [],
        adresse: []
      }];
    expect(noDataMockImporter.internal.splitInTransactions(sampleChangeset, reg0, reg4)).to.deep.equal(expectedResult);
  });

  it('Will correctly split changeset into transactions based on timestamp', function() {
    var sampleChangeset = {
      adgangspunkt: [
        {versionid: 2, registreringstart: reg2.toISOString(), registreringslut: null},
        {versionid: 3, registreringstart: reg2.toISOString(), registreringslut: null},
        {versionid: 1, registreringstart: reg1.toISOString(), registreringslut: reg3.toISOString()}
      ],
      husnummer: [
        {versionid: 1, registreringstart: reg2.toISOString(), registreringslut: null}
      ],
      adresse: [
        {versionid: 1, registreringstart: reg3.toISOString(), registreringslut: null}
      ]
    } ;
    var expectedResult = [
      {
        adgangspunkt: [{versionid: 1, registreringstart: reg1.toISOString(), registreringslut: null}],
        husnummer: [],
        adresse: []
      },
      {
        adgangspunkt: [
          {versionid: 2, registreringstart: reg2.toISOString(), registreringslut: null},
          {versionid: 3, registreringstart: reg2.toISOString(), registreringslut: null}],
        husnummer: [
          {versionid: 1, registreringstart: reg2.toISOString(), registreringslut: null}
        ],
        adresse: []
      },
      {
        adgangspunkt: [{versionid: 1, registreringstart: reg1.toISOString(), registreringslut: reg3.toISOString()}],
        husnummer: [],
        adresse: [{versionid: 1, registreringstart: reg3.toISOString(), registreringslut: null}]
      }];
    expect(noDataMockImporter.internal.splitInTransactions(sampleChangeset, reg0, reg4)).to.deep.equal(expectedResult);
  });

  it('If there are more records than can be fetched in one batch,' +
  '  we will continue to fetch records until we have them all.', function() {
    var mockedImporter = mockImporter({
      adgangspunkt: [[
        {versionid: 1, registreringstart: reg1.toISOString(), registreringslut: null},
        {versionid: 2, registreringstart: reg2.toISOString(), registreringslut: null},
        {versionid: 3, registreringstart: reg2.toISOString(), registreringslut: null},
        {versionid: 4, registreringstart: reg3.toISOString(), registreringslut: null},
        {versionid: 5, registreringstart: reg3.toISOString(), registreringslut: null}
      ]],
      husnummer: [[]],
      adresse: [[]]
    });

    return mockedImporter.internal.fetchUntilStable(baseurl, null, t1, t2, null).then(function(result) {
      expect(result.adgangspunkt).to.have.length(5);
    });
  });

  it('If we receive both the creation and the expiration of a record in one batch, only the expired record should survive',
    function() {
      var mockedImporter = mockImporter({
        adgangspunkt: [[
          {versionid: 1, registreringstart: reg1.toISOString(), registreringslut: null},
          {versionid: 2, registreringstart: reg2.toISOString(), registreringslut: null},
          {versionid: 3, registreringstart: reg2.toISOString(), registreringslut: null},
          {versionid: 1, registreringstart: reg1.toISOString(), registreringslut: reg3.toISOString()}
        ]],
        husnummer: [[]],
        adresse: [[]]
      });
    return mockedImporter.internal.fetchUntilStable(baseurl, null, t1, t2, null).then(function(result) {
      expect(result.adgangspunkt).to.have.length(3);
      var record = _.findWhere(result.adgangspunkt, { versionid: 1});
      expect(record.registreringslut).to.equal(reg3.toISOString());
    });
  });

  it('If tsTo is in the middle of a transaction, we will get the entire transaction anyway', function() {
    var mockedImporter = mockImporter({
      adgangspunkt: [[
        {versionid: 1, registreringstart: reg1.toISOString(), registreringslut: null,
          dbregistreringstart: reg1.toISOString()},
        {versionid: 2, registreringstart: reg1.toISOString(), registreringslut: null,
          dbregistreringstart: reg2_1.toISOString()}
      ]],
      husnummer: [[]],
      adresse: [[]]
    });
    return mockedImporter.internal.fetchUntilStable(baseurl, null, reg0, reg2, null).then(function(result) {
      expect(result.adgangspunkt).to.have.length(2);
    });

  });
  it('If tsTo close to a following transaction, we will not get the following transaction', function() {
    var mockedImporter = mockImporter({
      adgangspunkt: [[
        {versionid: 1, registreringstart: reg1.toISOString(), registreringslut: null,
          dbregistreringstart: reg1.toISOString()},
        {versionid: 2, registreringstart: reg2_1.toISOString(), registreringslut: null,
          dbregistreringstart: reg2_1.toISOString()}
      ]],
      husnummer: [[]],
      adresse: [[]]
    });
    return mockedImporter.internal.fetchUntilStable(baseurl, null, reg0, reg2, null).then(function(result) {
      expect(result.adgangspunkt).to.have.length(1);
    });
  });

  it('We will not process transactions after tsTo, even if it has been fetched', function() {
    var sampleChangeset = {
      adgangspunkt: [
        {versionid: 1, registreringstart: reg1.toISOString(), registreringslut: reg2_1.toISOString()}],
      husnummer: [],
      adresse: []
    };

    var expectedResult = [
      {
        adgangspunkt: [{versionid: 1, registreringstart: reg1.toISOString(), registreringslut: null}],
        husnummer: [],
        adresse: []
      }];
    expect(noDataMockImporter.internal.splitInTransactions(sampleChangeset, reg0, reg2)).to.deep.equal(expectedResult);
  });
});