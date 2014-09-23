"use strict";

var fs = require('fs');
var Q = require('q');

var datamodels = require('../crud/datamodel');
var divergensImpl = require('./divergensImpl');
var dataUtil = require('./dataUtil');
var loadAdresseImpl = require('./load-adresse-data-impl');


var MAX_INT = 2147483647;

function loadPostnummerCsv(client, inputFile, tableName) {
  return function() {
    console.log('indlæser CSV');
    var stream = fs.createReadStream(inputFile);
    return Q.nfcall(loadAdresseImpl.loadCsv, client, stream, {
      tableName: tableName,
      transformer: function(row) {
        return {
          nr: row.postnr,
          navn: row.navn,
          stormodtager: row.stormodtager
        };
      },
      columns: ['nr', 'navn', 'stormodtager']
    });
  };
}

function createReport(client, inputFile) {
  var report = Q.nfcall(dataUtil.createTempTable, client, 'updated_postnumre', 'postnumre')
    .then(loadPostnummerCsv(client, inputFile, 'updated_postnumre'))
    .then(function() {
      console.log('Beregner forskel');
      return divergensImpl.computeTableDifferences(client, datamodels.postnummer, 'postnumre', 'updated_postnumre');
    });

  return report.then(function() {
    return Q.nfcall(dataUtil.dropTable,client, 'updated_postnumre');
  }).then(function() {
    return report;
  });
}

module.exports = function(client, inputFile) {
  return createReport(client, inputFile).then(function(report) {
    return divergensImpl.rectifyDifferences(client, datamodels.postnummer, report, MAX_INT);
  });
};