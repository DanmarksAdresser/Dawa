"use strict";

var expect = require('chai').expect;
var moment = require('moment');
var q = require('q');
var _ = require('underscore');

var importFromApiImpl = require('../../darImport/importFromApiImpl');



describe('API import', function() {
  var mockApiData = null, mockApiClient = null, mockedImporter = null;
  beforeEach(function() {
    mockApiData = {
      adgangspunkt: [],
      husnummer: [],
      adresse: []
    };
    mockApiClient = {
      getPage: function(baseurl, entityName, from, to) {
        function isBetween(stringTs) {
          if(!stringTs) {
            return false;
          }
          var ts = moment(stringTs);
          return !ts.isBefore(from) && !ts.isAfter(to);
        }
        var data = mockApiData[entityName];
        var matchingRecords = _.filter(data, function(record) {
          return isBetween(record.registreringstart) || isBetween(record.registreringslut);
        });
        var page = matchingRecords.slice(0, Math.min(3, matchingRecords.length));
        return q(page);
      }
    };
    mockedImporter = importFromApiImpl({
      maxDarTxDuration: moment.duration(10, 'milliseconds'),
      maxReturnedRecords: 3,
      darClient: mockApiClient
    });
  });


  var baseurl = 'BASE_URL';

  var t1 = moment('2015-01-01T00:00:00.000Z');
  var t2 = moment('2015-01-02T00:00:00.000Z');

  var reg1 = moment('2015-01-01T01:00:00.000Z');
  var reg2 = moment('2015-01-01T02:00:00.000Z');
  var reg3 = moment('2015-01-01T03:00:00.000Z');

  it('Will correctly split changeset into transactions based on timestmap', function() {
    var sampleChangeset = {
      adgangspunkt: [
        {versionid: 1, registreringstart: reg1.toISOString(), registreringslut: null},
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
    expect(mockedImporter.internal.splitInTransactions(sampleChangeset)).to.deep.equal(expectedResult);
  });

  it('If there are more records than can be fetched in one batch,' +
  '  we will continue to fetch records until we have them all.', function() {
    mockApiData.adgangspunkt = [
      {versionid: 1, registreringstart: reg1.toISOString(), registreringslut: null},
      {versionid: 2, registreringstart: reg2.toISOString(), registreringslut: null},
      {versionid: 3, registreringstart: reg2.toISOString(), registreringslut: null},
      {versionid: 4, registreringstart: reg3.toISOString(), registreringslut: null},
      {versionid: 5, registreringstart: reg3.toISOString(), registreringslut: null}
    ];

    return mockedImporter.internal.fetchUntilStable(baseurl, null, t1, t2, null).then(function(result) {
      expect(result.adgangspunkt).to.have.length(5);
    });
  });

  it('If we receive both the creation and the expiration of a record in one run, only the expired record will survice', function() {
    mockApiData.adgangspunkt = [
      {versionid: 1, registreringstart: reg1.toISOString(), registreringslut: null},
      {versionid: 2, registreringstart: reg2.toISOString(), registreringslut: null},
      {versionid: 3, registreringstart: reg2.toISOString(), registreringslut: null},
      {versionid: 1, registreringstart: reg1.toISOString(), registreringslut: reg3.toISOString()}
    ];
    return mockedImporter.internal.fetchUntilStable(baseurl, null, t1, t2, null).then(function(result) {
      expect(result.adgangspunkt).to.have.length(3);
      var record = _.findWhere(result.adgangspunkt, { versionid: 1});
      expect(record.registreringslut).to.equal(reg3.toISOString());
    });
  });

});