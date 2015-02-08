"use strict";

var async = require('async');
var transactions  = require('../../psql/transactions');
var bbrEvents = require('./bbrEvents');
var Q = require('q');
var logger = require('../../logger').forCategory('bbrEventImporter');

var dynamoEvents = require('../common/dynamoEvents');

module.exports = function(pgConnectionUrl, dd, tablename, callback) {
  var foundEvent, errorHappened;
  async.doWhilst(function(callback) {
    foundEvent = false;
    errorHappened = false;
    transactions.withTransaction( {
      connString: pgConnectionUrl,
      pooled: false,
      mode: 'READ_WRITE'
    }, function(client) {
      return Q.nfcall(async.waterfall, [
        // get the sequence number of the last processed event
        function(callback) {
          client.query("SELECT GREATEST((SELECT MAX(sekvensnummer) FROM bbr_events), (SELECT sequence_number FROM bbr_sekvensnummer)) as max", [], function(err, result) {
            if(err) {
              return callback(err);
            }
            var lastProcessedSeqNum = result.rows[0].max;
            if(lastProcessedSeqNum === undefined) {
              lastProcessedSeqNum = 0;
            }
            logger.debug("Last processed event number", {lastProcessedSeqNum: lastProcessedSeqNum});
            callback(null, lastProcessedSeqNum);
          });
        },
        // fetch the events from dynamodb
        function(lastProcessedBbrSeqNum, callback) {
          var nextBbrSeqNum = lastProcessedBbrSeqNum + 1;
          logger.debug("Next BBR sequence number", {nextBbrSeqNum: nextBbrSeqNum});
          dynamoEvents.query(dd, tablename, nextBbrSeqNum, null).then(function(result) {
            if(result.Items.length > 0) {
              foundEvent = true;
              return Q.nfcall(async.eachSeries, result.Items, function(item, callback) {
                var event = JSON.parse(item.data.S);
                bbrEvents.processEvent(client, event, callback);
              });
            }
          }).nodeify(callback);
        }
      ]);
    }).nodeify(callback);
  }, function() {
    return foundEvent && !errorHappened;
  }, callback );
};