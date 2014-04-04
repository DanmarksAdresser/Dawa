"use strict";

var async = require('async');
var util = require('util');
var Q = require('q');
var winston        = require('winston');

function putItemQ(dd, tablename, seqNr, data) {
  var item = {key:   {'S': 'haendelser' },
    seqnr: {'N': ''+seqNr },
    data:  {'S': JSON.stringify(data)}};
  winston.info('Putting item: %j', item, {});
  return Q.ninvoke(dd, 'putItem', {TableName: tablename,
    Expected: {seqnr: {Exists: false}},
    Item: item});
}

function putItem(dd, tablename, seqNr, data, cb) {
  var item = {key:   {'S': 'haendelser' },
    seqnr: {'N': ''+seqNr },
    data:  {'S': JSON.stringify(data)}};
  winston.info('Putting item: %j', item, {});
  dd.putItem({TableName: tablename,
      Expected: {seqnr: {Exists: false}},
      Item: item},
    function(error, latest){
      if (error)
      {
        cb({type: 'InternalServerError',
            title: 'Error querying DynamoDB',
            details: util.format('Error reading from DynamoDB error=%j data=%j', error, latest)},
          latest);
      }
      else
      {
        cb(error, latest);
      }
    });
}

function getLatestQ(dd, tablename) {
  var params = {TableName: tablename,
    KeyConditions: {'key': {ComparisonOperator: 'EQ',
      AttributeValueList: [{'S': 'haendelser' }]}},
    ConsistentRead: true,
    ScanIndexForward: false,
    Limit: 1
  };
  return Q.ninvoke(dd, 'query', params);
}

function getLatest(dd, tablename, cb) {
  var params = {TableName: tablename,
    KeyConditions: {'key': {ComparisonOperator: 'EQ',
      AttributeValueList: [{'S': 'haendelser' }]}},
    ConsistentRead: true,
    ScanIndexForward: false,
    Limit: 1
  };
  dd.query(params, function(error, latest){
    if (error)
    {
      cb({type: 'InternalServerError',
          title: 'Error querying DynamoDB',
          details: util.format('Error reading from DynamoDB error=%j data=%j', error, latest)},
        latest);
    }
    else
    {
      cb(error, latest);
    }
  });
}

function getAllQ(dd, table) {
  var params = {
    TableName: table,
    KeyConditions: {
      'key': {ComparisonOperator: 'EQ',
        AttributeValueList: [{'S': 'haendelser' }]}},
    ConsistentRead: true
  };
  return Q.ninvoke(dd, 'query', params);
}

function getAll(dd, table, cb) {
  var params = {
    TableName: table,
    KeyConditions: {
      'key': {ComparisonOperator: 'EQ',
        AttributeValueList: [{'S': 'haendelser' }]}},
    ConsistentRead: true
  };
  dd.query(params, cb);
}

function deleteItem(dd, tableName, item) {
  winston.info('Delete item %j', item.seqnr.N, {});
  return Q.ninvoke(dd, 'deleteItem', {TableName: tableName,
      Key: {key:   {S: 'haendelser'},
        seqnr: {N: item.seqnr.N}}});
}

function deleteItems(dd, tableName, items) {
  return items.map(function(item) {
    return function() {
      return deleteItem(dd, tableName, item);
    };
  }).reduce(Q.when, null);
}

function deleteAllQ(dd, tableName) {
  winston.info('Deleting all items');
  return getAllQ(dd, tableName).then(function(data) {
    if(data.Count === 0) {
      return;
    }
    else {
      return deleteItems(dd, tableName, data.Items);
    }
  });
}

function deleteAll(dd, tableName, cb){
  winston.info('Deleting all items');
  getAll(dd, tableName, function(error, data){
    if(error) {
      return cb(error);
    }
    if (data.Count === 0){
      cb(null);
    } else {
      async.eachSeries(data.Items,
        function(item, cb){
          winston.info('Delete item %j', item.seqnr.N, {});
          dd.deleteItem({TableName: tableName,
              Key: {key:   {S: 'haendelser'},
                seqnr: {N: item.seqnr.N}}},
            cb);
        },
        function(err) {cb(err);});
    }
  });
}

exports.putItem = putItem;
exports.getLatest = getLatest;
exports.deleteAll = deleteAll;
exports.getAll = getAll;

exports.putItemQ = putItemQ;
exports.getLatestQ = getLatestQ;
exports.deleteAllQ = deleteAllQ;
exports.getAllQ = getAllQ;