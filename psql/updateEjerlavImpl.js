"use strict";

var _ = require('underscore');
var fs = require('fs');
var Q = require('q');

var datamodels = require('../crud/datamodel');
var divergensImpl = require('./divergensImpl');
var dataUtil = require('./dataUtil');
var loadAdresseImpl = require('./load-adresse-data-impl');


var MAX_INT = 2147483647;

function loadEjerlavCsv(client, inputFile, tableName) {
  return function() {
    console.log('indlæser CSV');
    var stream = fs.createReadStream(inputFile);
    return Q.nfcall(loadAdresseImpl.loadCsv, client, stream, {
      tableName: tableName,
      columns: ['kode', 'navn'],
      transformer: _.identity
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

module.exports = function(client, inputFile) {
  return createReport(client, inputFile).then(function (report) {
    return divergensImpl.rectifyDifferences(client, datamodels.ejerlav, report, MAX_INT);
  });
}