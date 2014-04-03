"use strict";

var winston        = require('winston');
var util = require('util');
var async = require('async');


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