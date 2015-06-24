"use strict";

var child_process = require('child_process');
var fs = require('fs');
var path = require('path');
var q = require('q');
var _ = require('underscore');

var aboutOis = require('./aboutOis');
var oisDatamodels = require('./oisDatamodels');
var oisParser = require('./oisParser');
var qUtil = require('../q-util');
var sqlCommon = require('../psql/common');

function createUnzippedStream(filePath, filePattern) {
  var args = [ 'e', '-so', path.resolve(filePath) , filePattern];
  var proc = child_process.spawn( '7za', args);
  return q(proc.stdout);
}

function createOisStream(entityName, filePath) {
  var entityFacts = aboutOis[entityName];
  return createUnzippedStream(filePath, '*.XML').then(function(stream) {
    return oisParser.oisStream(stream, entityFacts);
  });
}


function oisFileToTable(client, entityName, filePath, tableName) {
  return createOisStream(entityName, filePath).then(function(oisStream) {
    var datamodel = oisDatamodels[entityName];
    return sqlCommon.streamToTable(client, oisStream, tableName, datamodel.columns);
  });
}

function importInitial(client, dataDir) {
  var files = fs.readdirSync(dataDir);
  var entityNames = Object.keys(aboutOis);

  return qUtil.mapSerial(entityNames, function(entityName) {
    console.log('importerer ' + entityName);
    var oisTable = aboutOis[entityName].oisTable;
    var dawaTable = oisDatamodels[entityName].table;
    var matches = _.filter(files, function(file) {
      return file.toLowerCase().indexOf(oisTable.toLowerCase()) !== -1;
    });
    if(matches.length !== 1) {
      throw new Error('Found ' + matches.length + ' files for OIS table ' + oisTable);
    }
    return oisFileToTable(client, entityName, path.join(dataDir, matches[0]), dawaTable);
  });
}

exports.oisFileToTable = oisFileToTable;
exports.importInitial = importInitial;