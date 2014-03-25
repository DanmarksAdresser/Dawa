"use strict";

var async = require('async');
var dbapi = require('../../dbapi');
var crud = require('../../crud/crud');
var handleBbrEvent = require('./handleBbrEvent');
var winston = require('winston');
var eventSchemas = require('../common/eventSchemas');
var ZSchema = require("z-schema");


var bbrEventsDatamodel = {
  table: 'bbr_events',
    columns: ['sekvensnummer', 'type', 'bbrTidspunkt', 'created', 'data'],
  key: ['sekvensnummer']
};

function storeEvent(client, event, callback) {
  var dbRow = {
    sekvensnummer: event.sekvensnummer,
    type: event.type,
    bbrTidspunkt: event.tidspunkt,
    created: new Date().toISOString(),
    data: JSON.stringify(event.data)
  };
  winston.debug("storing bbr event in bbr_events table");
  crud.create(client, bbrEventsDatamodel, dbRow, callback);
}

function processEvent(client, event, callback) {
  winston.info("Processing event with sequence number %d", event.sekvensnummer);
  async.series([
    function(callback) {
      console.log(JSON.stringify(event));
      console.log(JSON.stringify(eventSchemas[event.type]));
      var validator = new ZSchema();
      validator.validate(event, eventSchemas[event.type], callback);
    },
    function(callback) {
      storeEvent(client, event, callback);
    },
    function(callback) {
      handleBbrEvent(client, event, callback);
    }
  ], callback);
}

module.exports = function(dd, tablename, initialSequenceNumber, callback) {
  winston.debug("importing bbr events, initial sequence number %d", initialSequenceNumber);
  var foundEvent, errorHappened;
  async.doWhilst(function(callback) {
    foundEvent = false;
    errorHappened = false;
    var transactionDone;
    async.waterfall([
      // start the transaction
      function(callback) {
        dbapi.withWriteTransaction(function(err, client, _transactionDone) {
          if(err) {
            return callback(err);
          }
          transactionDone = _transactionDone;
          callback(null, client);
        });
      },
      // get the sequence number of the last processed event
      function(client, callback) {
        client.query("SELECT MAX(sekvensnummer) FROM bbr_events", [], function(err, result) {
          if(err) {
            return callback(err);
          }
          var lastProcessedSeqNum = result.rows[0].max;
          winston.debug("Last processed event number: %d", lastProcessedSeqNum);
          callback(null, client, lastProcessedSeqNum);
        });
      },
      // fetch the event from dynamodb
      function(client, lastProcessedSeqNum, callback) {
        var nextSeqNum;
        console.log("Last processed " + JSON.stringify(lastProcessedSeqNum));
        if(lastProcessedSeqNum) {
          nextSeqNum = lastProcessedSeqNum + 1;
        }
        else {
          nextSeqNum = initialSequenceNumber + 1;
        }
        winston.debug("Next sequence number: %d", nextSeqNum);
        var params = {
          TableName: tablename,
          KeyConditions: {
            'key': {
              ComparisonOperator: 'EQ',
              AttributeValueList: [{
                'S': 'haendelser' }]
            },
            'seqnr': {
              ComparisonOperator: 'EQ',
              AttributeValueList: [{
                N: "" +nextSeqNum
              }]
            }
          },
          ConsistentRead: true
        };
        dd.query(params, function(err, result) {
          if(err) {
            return callback(err);
          }
          var event = null;
          if(result.Items.length === 1) {
            event = JSON.parse(result.Items[0].data.S);
            foundEvent = true;
          }
          callback(null, client, event);
        });
      },
      // process the event
      function(client, event, callback) {
        if(foundEvent) {
          processEvent(client, event, callback);
        }
        else {
          callback(null);
        }
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