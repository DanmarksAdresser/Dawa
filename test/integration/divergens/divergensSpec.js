"use strict";

var expect = require('chai').expect;
var fs = require('fs');

var divergensImpl = require('../../../psql/divergensImpl');
var testdb = require('../../helpers/testdb');

describe('divergenscheck', function() {
  describe('compareWithCurrent', function() {
    var data1Options = {
      dataDir: __dirname + '/compareWithCurrent/data1',
      filePrefix: '',
      format: 'bbr'
    };

    var data2Options = {
      dataDir: __dirname + '/compareWithCurrent/data2',
      filePrefix: '',
      format: 'bbr'
    };
    var expectedData1Report = JSON.parse(fs.readFileSync(__dirname + '/compareWithCurrent/data1Report.json'));
    var expectedData2Report = JSON.parse(fs.readFileSync(__dirname + '/compareWithCurrent/data2Report.json'));
    var data2ReportSecondRun = JSON.parse(fs.readFileSync(__dirname + '/compareWithCurrent/data2ReportSecondRun.json'));

    it('Should correctly detect and rectify differences', function() {
      return testdb.withTransaction('empty', 'ROLLBACK', function(client) {
        return divergensImpl.divergenceReport(client, data1Options, {
          compareWithCurrent: true
        }).then(function(report) {
          return divergensImpl.rectifyAll(client, report).then(function(report) {
            expect(JSON.parse(JSON.stringify(report))).to.deep.equal(expectedData1Report);
          });
        }).then(function() {
          return divergensImpl.divergenceReport(client, data2Options, {
            compareWithCurrent: true
          }).then(function(report) {
            return divergensImpl.rectifyAll(client, report).then(function(report) {
              expect(JSON.parse(JSON.stringify(report))).to.deep.equal(expectedData2Report);
            });
          });
        }).then(function() {
          return divergensImpl.divergenceReport(client, data2Options, {
            compareWithCurrent: true
          }).then(function(report) {
            return divergensImpl.rectifyAll(client, report).then(function(report) {
              expect(report).to.deep.equal(data2ReportSecondRun);
            });
          });
        });
      });
    });
  });

  describe('willNotRectifyUpdated', function(){
    var initialOptions = {
      dataDir: __dirname + '/willNotRectifyUpdated/initial',
      filePrefix: '',
      format: 'bbr'
    };

    var updatedOptions = {
      dataDir: __dirname + '/willNotRectifyUpdated/updated',
      filePrefix: '',
      format: 'bbr'
    };

    var expectedReport = JSON.parse(fs.readFileSync(__dirname + '/willNotRectifyUpdated/expectedReport.json'));

    /**
     * When the initial update is loaded, Gade1 is created with sequence number 1,
     * Gade2 is created with sequence number 2, and Gade3 is created with sequence number 3.
     *
     * In the update, the sequence number is forced to 1. Gade1 has been modified, which should be rectified,
     * Gade2 does not exist, which should not appear in the report, because the record is created with sequence number 1
     * and gade3 is modified, which should not be rectified since gade 3 has sequence number 3.
     */
    it('If an object has been modified later than the sequence number indicated, it will not be rectified', function () {
      return testdb.withTransaction('empty', 'ROLLBACK', function(client) {
        return divergensImpl.divergenceReport(client, initialOptions, {
          compareWithCurrent: true
        }).then(function (report) {
          return divergensImpl.rectifyAll(client, report);
        })
          .then(function () {
            return divergensImpl.divergenceReport(client, updatedOptions, {
              forceDawaSequenceNumber: 1
            }).then(function (report) {
              return divergensImpl.rectifyAll(client, report).then(function (report) {
                expect(report).to.deep.equal(expectedReport);
              });
            });
          });
      });
    });
  });
});
