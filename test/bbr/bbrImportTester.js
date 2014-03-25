"use strict";

var AWS = require('aws-sdk');
var fs = require('fs');
var async = require('async');

var dynamoEvents = require('../../bbr/common/dynamoEvents');
var importBbrEvents = require('../../bbr/eventImporter/importBbrEvents');
var winston = require('winston');

winston.handleExceptions(new winston.transports.Console());

winston.remove(winston.transports.Console);
winston.add(winston.transports.Console, {level: 'debug'});
winston.cli();

var dd = new AWS.DynamoDB(
  {apiVersion      : '2012-08-10',
    region          : 'eu-west-1',
    accessKeyId     : process.env.awsAccessKeyId,
    secretAccessKey : process.env.awsSecretAccessKey});

var tableName = 'dawatest';

var events = JSON.parse(fs.readFileSync(__dirname + '/validEventSequence.json', {
  encoding: "UTF-8"
}));

function storeEventsInDynamo(dd, tableName, events, callback) {
  winston.debug("Storing events in dynamo");
  async.eachSeries(events, function(event, callback) {
    dynamoEvents.putItem(dd, tableName, event.sekvensnummer, event, callback);
  }, callback);
}

async.series([
  function(callback) {
    dynamoEvents.deleteAll(dd, tableName, callback);
  },
  function(callback) {
    storeEventsInDynamo(dd, tableName, events, callback);
  },
  function(callback) {
    importBbrEvents(dd, tableName, 9, callback);
  }],
  function(err) {
    if(err) {
      winston.error(err);
      process.exit(1);
    }
    winston.info("BBR import completed");
    process.exit(0);
  }
);
