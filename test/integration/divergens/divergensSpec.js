"use strict";

var fs = require('fs');

var divergensImpl = require('../../../psql/divergensImpl');
var sqlCommon = require('../../../psql/common');

describe('divergenscheck', function() {
  var data1Options = {
    dataDir: __dirname + '/data1',
    filePrefix: '',
    format: 'bbr'
  };

  var data2Options = {
    dataDir: __dirname + '/data2',
    filePrefix: '',
    format: 'bbr'
  };
  var expectedData1Report = JSON.parse(fs.readFileSync(__dirname + '/data1Report.json'));
  var expectedData2Report = JSON.parse(fs.readFileSync(__dirname + '/data2Report.json'));
  var data2ReportSecondRun = JSON.parse(fs.readFileSync(__dirname + '/data2ReportSecondRun.json'));

  it('Should correctly detect and rectify differences', function(done) {
    sqlCommon.withWriteTranaction(process.env.pgEmptyDbUrl, function(err, client, transactionDone) {
      divergensImpl.divergenceReport(client, data1Options, true).then(function(report) {
        return divergensImpl.rectifyAll(client, report).then(function(report) {
          expect(report).toEqual(expectedData1Report);
        });
      }).then(function() {
        return divergensImpl.divergenceReport(client, data2Options, true).then(function(report) {
          return divergensImpl.rectifyAll(client, report).then(function(report) {
            expect(report).toEqual(expectedData2Report);
          });
        });
      }).then(function() {
        return divergensImpl.divergenceReport(client, data2Options, true).then(function(report) {
          return divergensImpl.rectifyAll(client, report).then(function(report) {
            expect(report).toEqual(data2ReportSecondRun);
          });
        });
      }).then(function() {
        transactionDone("rollback", function() {
          if(err) {
            throw err;
          }
          done();
        });
      }).done();
    });
  });
});