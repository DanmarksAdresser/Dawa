"use strict";

var cli = require('cli');
var _ = require('underscore');

var cliParameterParsing = require('../common/cliParameterParsing');

var optionSpec = {
  awsRegion: [false, 'AWS region, hvor Dynamo databasen befinder sig', 'string', 'eu-west-1'],
  awsAccessKeyId: [false, 'Access key der anvendes for at tilgå Dynamo', 'string'],
  awsSecretAccessKey: [false, 'Secret der anvendes for at tilgå Dynamo', 'string'],
  dynamoTable: [false, 'Dynamo table hvori hændelserne er', 'string'],
  initialSequenceNumber: [false, 'Hændelsessekvensnummeret som er tilknyttet totaludtrækket i databasen', 'number'],
  pgConnectionUrl: [false, 'URL som anvendes ved forbindelse til databasen', 'string']
};


cliParameterParsing.main(optionSpec, _.keys(optionSpec), function(args, options) {
  process.env.pgConnectionUrl = options.pgConnectionUrl;

  var AWS            = require('aws-sdk');
  var importBbrEvents = require('./importBbrEvents');

  var dd = new AWS.DynamoDB({
    apiVersion      : '2012-08-10',
    region          : options.awsRegion,
    accessKeyId     : options.awsAccessKeyId,
    secretAccessKey : options.awsSecretAccessKey
  });

  importBbrEvents(dd, options.dynamoTable, options.initialSequenceNumber, function(err) {
    if(err) {
      console.log(err);
      process.exit(1);
    }
    process.exit(0);
  });
});

