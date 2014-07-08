"use strict";

var _ = require('underscore');

var cliParameterParsing = require('../common/cliParameterParsing');
var logger = require('../../logger').forCategory('bbrEventImporter');

var optionSpec = {
  awsRegion: [false, 'AWS region, hvor Dynamo databasen befinder sig', 'string', 'eu-west-1'],
  awsAccessKeyId: [false, 'Access key der anvendes for at tilgå Dynamo', 'string'],
  awsSecretAccessKey: [false, 'Secret der anvendes for at tilgå Dynamo', 'string'],
  dynamoTable: [false, 'Dynamo table hvori hændelserne er', 'string'],
  pgConnectionUrl: [false, 'URL som anvendes ved forbindelse til databasen', 'string']
};


cliParameterParsing.main(optionSpec, _.keys(optionSpec), function(args, options) {

  var AWS            = require('aws-sdk');
  var importBbrEvents = require('./importBbrEvents');

  var dd = new AWS.DynamoDB({
    apiVersion      : '2012-08-10',
    region          : options.awsRegion,
    accessKeyId     : options.awsAccessKeyId,
    secretAccessKey : options.awsSecretAccessKey
  });

  importBbrEvents(options.pgConnectionUrl, dd, options.dynamoTable, function(err) {
    if(err) {
      logger.error('Fejl under indlæsning af BBR hændelser', err);
      process.exit(1);
    }
  });
});

