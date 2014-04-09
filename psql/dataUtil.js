"use strict";

var eventStream = require('event-stream');
var copyFrom = require('pg-copy-streams').from;
var copyTo = require('pg-copy-streams').to;
var logger = require('../logger');
var _ = require('underscore');

var dbapi = require('../dbapi');

exports.queryDifferences = function(client, expectedTable, actualTable, datamodel, callback) {
  var query = {
    select: [],
    from: [],
    whereClauses: [],
    orderClauses: [],
    sqlParams: []
  };
  query.from.push(expectedTable + ' e FULL JOIN ' + actualTable  + ' a ON (' +
    _.map(datamodel.key, function(keyColumn) {
      return 'e.' + keyColumn + ' = a.' + keyColumn;
    }).join(' AND ') + ')');
  datamodel.columns.forEach(function(column) {
    query.select.push('e.' + column + ' as e_' + column);
    query.select.push('a.' + column + ' as a_' + column);
  });
  datamodel.key.forEach(function(keyColumn) {
    query.orderClauses.push('a_' + keyColumn);
  });
  query.whereClauses.push(_.map(datamodel.columns, function(column) {
    return 'e.' + column + ' IS DISTINCT FROM a.' + column;
  }).join(' OR '));
  query.limit = 100;
  console.log(JSON.stringify(query));
  dbapi.query(client, query, callback);
};

exports.createTempTable = function(client, tableName, sourceTableName, callback) {
  logger.info('dataUtil', 'creating temp table' + tableName);
  client.query('CREATE TEMP TABLE ' + tableName  +'( LIKE ' + sourceTableName + ') ON COMMIT DROP', [], callback);
};

exports.csvToTable = function(client, csvStream, tableName, datamodel, callback) {
  var sql = "COPY " + tableName + "(" + datamodel.columns.join(',') + ") FROM STDIN WITH (ENCODING 'utf8',HEADER TRUE, FORMAT csv, DELIMITER ';', QUOTE '\"', NULL 'null')";
  var pgStream = client.query(copyFrom(sql));
  var stream = eventStream.pipeline(csvStream, pgStream);
  stream.on('error', callback);
  stream.on('end', callback);
};

exports.tableToCsv = function(client, csvStream, tableName, datamodel, callback) {
  var sql = "COPY " + tableName + "(" + datamodel.columns.join(',') + ") TO STDOUT WITH (ENCODING 'utf8',HEADER TRUE, FORMAT csv, DELIMITER ';', QUOTE '\"', NULL 'null')";
  var pgStream = client.query(copyTo(sql));
  pgStream.pipe(csvStream);
  pgStream.on('error', function(err) {
    console.log('error!', err);
    callback(err);
  });
  pgStream.on('end', function() {
    console.log('end!');
    callback();
  });
};

exports.snapshotQuery = function(datamodel, sequenceNumberAlias) {
  var query = {
    select: [],
    from: [],
    whereClauses: [],
    orderClauses: [],
    sqlParams: []
  };
  datamodel.columns.forEach(function(column) {
    query.select.push(column);
  });
  query.from.push(datamodel.table + "_history");
  query.whereClauses.push("valid_from is null OR valid_from <= " + sequenceNumberAlias);
  query.whereClauses.push("valid_to is null OR valid_to >= " + sequenceNumberAlias);
  return dbapi.createQuery(query).sql;
};