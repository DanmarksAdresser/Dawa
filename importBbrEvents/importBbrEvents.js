"use strict";

var async = require('async');
var dbapi = require('../dbapi');
var crud = require('../crud/crud');
var handleBbrEvent = require('./handleBbrEvent');

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
  crud.create(client, bbrEventsDatamodel, dbRow, callback);
}

function processEvent(client, event, callback) {
  async.series([
    function(callback) {
      storeEvent(client, event, callback);
    },
    function(callback) {
      handleBbrEvent(client, event, callback);
    }
  ], callback);
}

module.exports = function(dd, tablename, initialSequenceNumber, callback) {
  var foundEvent, errorHappened;
  async.doWhilst(function(callback) {
    foundEvent = false;
    errorHappened = false;
    var lastProcessedSeqNum, client, transactionDone, event;
    async.series([
      // start the transaction
      function(callback) {
        dbapi.withWriteTransaction(function(err, _client, _transactionDone) {
          if(err) {
            return callback(err);
          }
          client = _client;
          transactionDone = _transactionDone;
          callback(null);
        });
      },
      // get the sequence number of the last processed event
      function(callback) {
        client.query("SELECT MAX(sekvensnummer) FROM bbr_events", [], function(err, result) {
          if(err) {
            return callback(err);
          }
          lastProcessedSeqNum = result.rows[0].max;
          callback(null);
        });
      },
      // fetch the event from dynamodb
      function(callback) {
        var nextSeqNum;
        console.log("Last processed " + JSON.stringify(lastProcessedSeqNum));
        if(lastProcessedSeqNum) {
          nextSeqNum = lastProcessedSeqNum + 1;
        }
        else {
          nextSeqNum = initialSequenceNumber + 1;
        }
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
          if(result.Items.length === 1) {
            event = JSON.parse(result.Items[0].data.S);
            foundEvent = true;
          }
          callback(null);
        });
      },
      // process the event
      function(callback) {
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
      transactionDone(err, callback);
    });
  }, function() {
    return foundEvent && !errorHappened;
  }, function(err) {
    console.log(err);
    callback(err);
  });
};