"use strict";

var cli = require('cli');
var _ = require('underscore');

var optionSpec = {
  awsRegion: [false, 'AWS region, hvor Dynamo databasen befinder sig', 'string', 'eu-west-1'],
  awsAccessKeyId: [false, 'Access key der anvendes for at tilgå Dynamo', 'string'],
  awsSecretAccessKey: [false, 'Secret der anvendes for at tilgå Dynamo', 'string'],
  dynamoTable: [false, 'Dynamo table hvori hændelserne er', 'string'],
  initialSequenceNumber: [false, 'Hændelsessekvensnummeret som er tilknyttet totaludtrækket i databasen', 'number'],
  pgConnectionUrl: [false, 'URL som anvendes ved forbindelse til databasen', 'string']
};
cli.parse(optionSpec, []);

function checkRequiredOptions(options, requiredOptions) {
  var suppliedOptions = _.reduce(options, function(memo, value, key) {
    if(!_.isUndefined(value) && !_.isNull(value)) {
      memo.push(key);
    }
    return memo;
  }, []);
  var missingOptions = _.difference(requiredOptions,suppliedOptions);
  if(missingOptions.length > 0) {
    console.error('Missing required options: ' + JSON.stringify(missingOptions));
    process.exit(1);
  }
}

function parseOptionValue(format, value) {
  if(_.isUndefined(value)) {
    return undefined;
  }
  if(format === 'string') {
    return value;
  }
  if(format === 'number') {
    return parseFloat(value);
  }
}

function addEnvironmentOptions(parameterSpec, options) {
  _.each(parameterSpec, function(spec, key) {
    if(_.isUndefined(options[key]) || _.isNull(options[key])) {
      var format = spec[2];
      options[key] = parseOptionValue(format, process.env[key]);
    }
  });
}

cli.main(function(args, options) {
  addEnvironmentOptions(optionSpec, options);
  process.env.pgConnectionUrl = options.pgConnectionUrl;

  checkRequiredOptions(options, _.keys(optionSpec));

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

