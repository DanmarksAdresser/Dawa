"use strict";

var Q = require('q');
var winston        = require('winston');
var _ = require('underscore');

function putItemQ(dd, tablename, seqNr, data) {
  var item = {key:   {'S': 'haendelser' },
    seqnr: {'N': ''+seqNr },
    data:  {'S': JSON.stringify(data)}};
  winston.info('Putting item: %j', item, {});
  return Q.ninvoke(dd, 'putItem', {TableName: tablename,
    Expected: {seqnr: {Exists: false}},
    Item: item});
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


function getAllQ(dd, table) {
  var params = {
    TableName: table,
    KeyConditions: {
      'key': {ComparisonOperator: 'EQ',
        AttributeValueList: [{'S': 'haendelser' }]}},
    ConsistentRead: true
  };
  return Q.ninvoke(dd, 'query',params);
}

function existy(sekvensnummerTilInclusive) {
  return !_.isUndefined(sekvensnummerTilInclusive) && !_.isNull(sekvensnummerTilInclusive);
}
function queryQ(dd, table, sekvensnummerFraInclusive, sekvensnummerTilInclusive) {
  var sekvensnummerClause;
  if(existy(sekvensnummerFraInclusive) && !existy(sekvensnummerTilInclusive)) {
    sekvensnummerClause = {
      ComparisonOperator: 'GE',
      AttributeValueList: [{N: ""+sekvensnummerFraInclusive}]
    };
  }
  else if(!existy(sekvensnummerFraInclusive) && existy(sekvensnummerTilInclusive)) {
    sekvensnummerClause = {
      ComparisonOperator: 'LE',
      AttributeValueList: [{N: ""+sekvensnummerTilInclusive}]
    };
  }
  else if(existy(sekvensnummerFraInclusive) && existy(sekvensnummerTilInclusive)) {
    sekvensnummerClause = {
      ComparisonOperator: 'BETWEEN',
      AttributeValueList: [{N: sekvensnummerFraInclusive}, {N: sekvensnummerTilInclusive}]
    };
  }
  var params = {
    TableName: table,
    KeyConditions: {
      'key': {
        ComparisonOperator: 'EQ',
        AttributeValueList: [{'S': 'haendelser' }]
      }
    },
    ConsistentRead: true
  };
  if(sekvensnummerClause) {
    params.KeyConditions.seqnr = sekvensnummerClause;
  }
  return Q.ninvoke(dd, 'query', params);
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

exports.putItemQ = putItemQ;
exports.getLatestQ = getLatestQ;
exports.deleteAllQ = deleteAllQ;
exports.query = queryQ;
exports.getAllQ = getAllQ;