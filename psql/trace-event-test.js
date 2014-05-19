"use strict";

var async = require('async');
var fs = require('fs');

var bbrEvents = require('../bbr/eventImporter/bbrEvents');
var cliParameterParsing = require('../bbr/common/cliParameterParsing');
var dataUtil = require('./dataUtil');
var historyDatamodels = require('../crud/historyDatamodels');
var dbapi2 = require('../dbapi2');

var optionSpec = {
  pgConnectionUrl: [false, 'URL som anvendes ved forbindelse til databasen (skal være initialiseret, men tom)', 'string'],
  events: [false, 'JSON-fil med events fra BBR', 'string'],
  targetDirectory: [false, 'Folder hvor CSV-filterne med resultatet af at processere events skal placeres', 'string', '.']
};

function extractResult(client, path, callback) {
  async.eachSeries(['vejstykke', 'adgangsadresse', 'enhedsadresse'], function(dataModelName, callback) {
    var filename = dataModelName + '.csv';
    console.log('outputting ' + filename);
    var stream = fs.createWriteStream(path + '/' + filename);
    dataUtil.tableToCsv(client, stream, historyDatamodels[dataModelName].table, historyDatamodels[dataModelName], function(err) {
      console.log('callback invoked');
      callback(err);
    });
  }, callback);
}

cliParameterParsing.main(optionSpec, Object.keys(optionSpec), function(args, options) {
  var events = JSON.parse(fs.readFileSync(options.events, {
    encoding: "UTF-8"
  }));

  var dbapi = dbapi2({dbUrl: options.pgConnectionUrl});
  dbapi.withRollbackTransaction(function(err, client, done) {
    if(err) {
      throw err;
    }

    async.eachSeries(events, function(event, callback) {
      bbrEvents.processEvent(client, event, callback);
    }, function(err) {
      if(err) {
        throw err;
      }
      extractResult(client, options.targetDirectory, done);
    });


  });
});