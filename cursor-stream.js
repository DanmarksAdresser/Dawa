"use strict";

var util = require('util');
var Readable    = require('stream').Readable;
var statistics = require('./statistics');
var winston = require('winston');

util.inherits(CursorStream, Readable);
function CursorStream(client, cursorName, query) {
  var self = this;
  self.transactionEndListener = function (err) {
    self._close(new Error('Transaction ended unexpectedly', err));
  };
  Readable.call(this, {
    objectMode: true,
    highWaterMark: 1000
  });
  this.client = client;
  this.cursorName = cursorName;
  this.query = query;
  this.maxFetchSize = 200;
  this.closed = false;
  this.moreRowsAvailable = true;
  this.queryInProgress = false;
  this.initialPageFetched = false;

  client.once('transactionEnd', self.transactionEndListener);
}

CursorStream.prototype._doFetch = function(count) {
  var self = this;
  if(self.closed) {
    return;
  }
  if(self.queryInProgress) {
    throw "Invalid state: Query already in progress";
  }
  if(!self.moreRowsAvailable) {
    return;
  }
  self.queryInProgress = true;
  var fetchSize = Math.min(self.maxFetchSize,count);
  var fetch = 'FETCH ' + fetchSize +' FROM ' + self.cursorName;
  var before = Date.now();
  self.client.query(fetch, [], function(err, result) {
    var statCategory = self.initialPageFetched ?  'psql_stream_page' : 'psql_stream_initial_page';
    var meta = self.initialPageFetched ? {} : { query : self.query };
    statistics.emit(statCategory, Date.now() - before, err, meta);
    if(err) {
      console.log('error fetching ' + err);
      self._close(err);
    }
    if(self.closed) {
      return;
    }
    self.initialPageFetched = true;
    self.queryInProgress = false;
    if(result.rows.length < fetchSize) {
      self.moreRowsAvailable = false;
    }
    result.rows.forEach(function(row) {
      self.push(row);
    });

    if(!self.moreRowsAvailable) {
      self._close();
    }
  });
};

CursorStream.prototype._close = function(err) {
  var self = this;
  if(self.closed) {
    return;
  }
  self.client.removeListener('transactionEnd', self.transactionEndListener);
  if(err) {
    self.emit('error', err);
    self.push(null);
    self.client = null;
    self.closed = true;
    return;
  }
  else {
    self.push(null);
    self.closed = true;
    var close = "CLOSE " + self.cursorName;
    winston.info("Closing cursor: %j", close, {});
    self.client.query(close, [], function() {});
    self.client = null;
    return;
  }
};

CursorStream.prototype._read = function(count) {
  var self = this;
  if(self.closed) {
    winston.info('attempted read from a closed source');
    return;
  }
  if(!self.queryInProgress) {
    self._doFetch(count);
  }
};

module.exports = CursorStream;