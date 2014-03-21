"use strict";

var AWS            = require('aws-sdk');
var importBbrEvents = require('./importBbrEvents');

var dd = new AWS.DynamoDB({
  apiVersion      : '2012-08-10',
  region          : 'eu-west-1',
  accessKeyId     : process.env.accessKeyId,
  secretAccessKey : process.env.secretAccessKey
});

var TABLENAME = process.env.dynamoDBTableName;

var initialSequenceNumber = parseInt(process.env.initialSequenceNumber, 10);

importBbrEvents(dd, TABLENAME, initialSequenceNumber, function(err) {
  if(err) {
    console.log(err);
    process.exit(1);
  }
  process.exit(0);
});