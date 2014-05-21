"use strict";

var _ = require('underscore');
var dbapi = require('../dbapi');
var winston = require('winston');

exports.query = function(client, datamodel, filter, callback) {
  var sqlParts = {
    select: ['*'],
    from: [datamodel.table],
    whereClauses: [],
    orderClauses: [],
    sqlParams: []
  };
  exports.applyFilter(datamodel, sqlParts, filter);
  dbapi.query(client, sqlParts, callback);
};

exports.applyFilter = function(datamodel, sqlParts, filter) {
  _.each(filter, function(value, key) {
    var alias = dbapi.addSqlParameter(sqlParts, value);
    dbapi.addWhereClause(sqlParts, key + ' = ' + alias);
  });
}

exports.create = function(client, datamodel, object, callback) {
  var datamodelFields = datamodel.columns;
  var objectFields = _.keys(object);
  var invalidFields = _.difference(objectFields, datamodelFields);
  if(invalidFields.length > 0) {
    return callback(new Error("Invalid fields encountered in crud.create " + JSON.stringify(invalidFields)));
  }
  var columns = _.reject(_.keys(object), function(column) {
    return _.isUndefined(column) || _.isNull(column);
  });
  var sql = 'INSERT INTO ' + datamodel.table + '(' + columns.join(', ') + ') VALUES (' +
    _.map(columns, function(column, idx) {
      return '$' + (idx + 1);
    }).join(', ') + ')';
  var params = _.map(columns, function(column) {
    return object[column];
  });
  winston.debug("Executing SQL %s", sql);
  client.query(sql, params, callback);
};

// note: undefined properties on object are not modified,
// null values are set to null.
exports.update = function(client, datamodel, object, callback) {
  var updatedColumns = _.reject(_.keys(object), function(column) {
    return _.isUndefined(column) || _.contains(datamodel.key, column);
  });
  var sql = 'UPDATE ' + datamodel.table + ' SET ' + _.map(updatedColumns, function(column, idx) {
    return column + ' = $' +(idx+1 );
  }).join(', ') + ' WHERE ' + _.map(datamodel.key, function(column, idx) {
    return column + ' = $' + (1 + updatedColumns.length + idx);
  }).join(' AND ');
  var updateParams = _.map(updatedColumns, function(column) {
    return object[column];
  });
  var keyParams = _.map(datamodel.key, function(column) {
    return object[column];
  });
  var params = updateParams.concat(keyParams);
  winston.info(sql);
  client.query(sql, params, callback);
};

exports.delete = function(client, datamodel, key, callback) {
  var sql = 'DELETE FROM ' + datamodel.table + ' WHERE ' + _.map(datamodel.key, function(column, idx) {
    return column + ' = $' + (1 + idx);
  }).join(" AND ");
  var params = _.map(datamodel.key, function(column) {
    return key[column];
  });
  client.query(sql, params, callback);
};