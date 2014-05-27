"use strict";

var async = require('async');
var sqlCommon  = require('../../psql/common');
var bbrEvents = require('./bbrEvents');
var Q = require('q');
var winston = require('winston');

var dynamoEvents = require('../common/dynamoEvents');

module.exports = function(pgConnectionUrl, dd, tablename, callback) {
  var foundEvent, errorHappened;
  async.doWhilst(function(callback) {
    foundEvent = false;
    errorHappened = false;
    var transactionDone;
    async.waterfall([
      // start the transaction
      function(callback) {
        sqlCommon.withWriteTransaction(pgConnectionUrl, function(err, client, _transactionDone) {
          if(err) {
            return callback(err);
          }
          transactionDone = _transactionDone;
          callback(null, client);
        });
      },
      // get the sequence number of the last processed event
      function(client, callback) {
        client.query("SELECT GREATEST((SELECT MAX(sekvensnummer) FROM bbr_events), (SELECT sequence_number FROM bbr_sekvensnummer)) as max", [], function(err, result) {
          if(err) {
            return callback(err);
          }
          var lastProcessedSeqNum = result.rows[0].max;
          if(lastProcessedSeqNum === undefined) {
            lastProcessedSeqNum = 0;
          }
          winston.debug("Last processed event number: %d", lastProcessedSeqNum);
          callback(null, client, lastProcessedSeqNum);
        });
      },
      // fetch the events from dynamodb
      function(client, lastProcessedBbrSeqNum, callback) {
        var nextBbrSeqNum = lastProcessedBbrSeqNum + 1;
        winston.debug("Next BBR sequence number: %d", nextBbrSeqNum);
        dynamoEvents.query(dd, tablename, nextBbrSeqNum, null).then(function(result) {
          if(result.Items.length > 0) {
            foundEvent = true;
            return Q.nfcall(async.eachSeries, result.Items, function(item, callback) {
              var event = JSON.parse(item.data.S);
              bbrEvents.processEvent(client, event, callback);
            });
          }
        }).then(function() {
          callback();
        }).catch(callback);
      }
    ], function(err) {
      if(err) {
        errorHappened = true;
      }
      // commit / rollback transaction
      winston.debug("Committing transaction, error: " + err, err);
      transactionDone(err, callback);
    });
  }, function() {
    return foundEvent && !errorHappened;
  }, function(err) {
    if(err) {
      winston.error("An error happened");
    }
    callback(err);
  });
};