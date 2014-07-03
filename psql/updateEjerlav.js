"use strict";

// This script loads postnumre into the database from a CSV-file.

var _         = require('underscore');
var Q = require('q');
var fs = require('fs');

var sqlCommon = require('./common');
var datamodels = require('../crud/datamodel');
var dataUtil = require('./dataUtil');
var divergensImpl = require('./divergensImpl');
var loadAdresseImpl = require('./load-adresse-data-impl');

var cliParameterParsing = require('../bbr/common/cliParameterParsing');
var optionSpec = {
  pgConnectionUrl: [false, 'URL som anvendes ved forbindelse til databasen', 'string']
};

var MAX_INT = 2147483647;

function loadEjerlavCsv(client, inputFile, tableName) {
  return function() {
    console.log('indlæser CSV');
    var stream = fs.createReadStream(inputFile);
    return Q.nfcall(loadAdresseImpl.loadCsv, client, stream, {
      tableName: tableName,
      columns: ['kode', 'navn']
    });
  };
}

function createReport(client, inputFile) {
  var report = Q.nfcall(dataUtil.createTempTable, client, 'updated_ejerlav', 'ejerlav')
    .then(loadEjerlavCsv(client, inputFile, 'updated_ejerlav'))
    .then(function() {
      console.log('Beregner forskel');
      return divergensImpl.computeTableDifferences(client, datamodels.ejerlav, 'ejerlav', 'updated_ejerlav');
    });

  return report.then(function() {
    return Q.nfcall(dataUtil.dropTable,client, 'updated_ejerlav');
  }).then(function() {
    return report;
  });
}

cliParameterParsing.main(optionSpec, _.keys(optionSpec), function(args, options) {
  var inputFile = args[0];
  var connString = options.pgConnectionUrl;
  sqlCommon.withWriteTransaction(connString, function(err, client, commit) {
    if(err) {
      throw err;
    }
    createReport(client, inputFile).then(function(report) {
      return divergensImpl.rectifyDifferences(client, datamodels.ejerlav, report, MAX_INT);
    }).then(function() {
      return Q.nfcall(commit, null);
    }).then(function() {
      console.log('complete');
    }).done();
  });
});
