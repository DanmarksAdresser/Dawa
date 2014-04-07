"use strict";

var async = require('async');
var AWS = require('aws-sdk');
var fs = require('fs');
var winston = require('winston');

var cliParameterParsing = require('../../bbr/common/cliParameterParsing');

winston.remove(winston.transports.Console);
winston.add(winston.transports.Console, {level: 'debug'});

var optionSpec = {
  awsRegion: [false, 'AWS region, hvor Dynamo databasen befinder sig', 'string', 'eu-west-1'],
  awsAccessKeyId: [false, 'Access key der anvendes for at tilgå Dynamo', 'string'],
  awsSecretAccessKey: [false, 'Secret der anvendes for at tilgå Dynamo', 'string'],
  dynamoTable: [false, 'Navn på dynamo table hvori hændelserne gemmes', 'string'],
  pgConnectionUrl: [false, 'URL som anvendes ved forbindelse til databasen', 'string']
};

cliParameterParsing.main(optionSpec, Object.keys(optionSpec), function(args, options) {
  process.env.pgConnectionUrl = options.pgConnectionUrl;

  var dynamoEvents = require('../../bbr/common/dynamoEvents');
  var importBbrEvents = require('../../bbr/eventImporter/importBbrEvents');

  var dd = new AWS.DynamoDB(
    {apiVersion      : '2012-08-10',
      region          : options.awsRegion,
      accessKeyId     : options.awsAccessKeyId,
      secretAccessKey : options.awsSecretAccessKey});

  var tableName = options.dynamoTable;

  var events = JSON.parse(fs.readFileSync(__dirname + '/validEventSequence.json', {
    encoding: "UTF-8"
  }));

  function storeEventsInDynamo(dd, tableName, events, callback) {
    winston.debug("Storing events in dynamo");
    async.eachSeries(events, function(event, callback) {
      dynamoEvents.putItemQ(dd, tableName, event.sekvensnummer, event).then(function() { callback(); }).catch(callback);
    }, callback);
  }

  async.series([
    function(callback) {
      dynamoEvents.deleteAllQ(dd, tableName).then(function() {callback(); }).catch(callback);
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
});

