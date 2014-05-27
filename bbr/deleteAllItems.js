var _ = require('underscore');

var cliParameterParsing = require('./common/cliParameterParsing');
var dynamoEvents = require('./common/dynamoEvents');

var optionSpec = {
  awsRegion: [false, 'AWS region, hvor Dynamo databasen befinder sig', 'string', 'eu-west-1'],
  awsAccessKeyId: [false, 'Access key der anvendes for at tilgå Dynamo', 'string'],
  awsSecretAccessKey: [false, 'Secret der anvendes for at tilgå Dynamo', 'string'],
  dynamoTable: [false, 'Dynamo table hvori hændelserne er', 'string']
};


cliParameterParsing.main(optionSpec, _.keys(optionSpec), function(args, options) {

  var AWS            = require('aws-sdk');

  var dd = new AWS.DynamoDB({
    apiVersion      : '2012-08-10',
    region          : options.awsRegion,
    accessKeyId     : options.awsAccessKeyId,
    secretAccessKey : options.awsSecretAccessKey
  });

  dynamoEvents.deleteAllQ(dd, options.dynamoTable).done();
});