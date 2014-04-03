"use strict";

var util = require('util');
var Readable    = require('stream').Readable;
var winston = require('winston');

util.inherits(CursorStream, Readable);
function CursorStream(client, cursorName) {
  Readable.call(this, {
    objectMode: true,
    highWaterMark: 1000
  });
  this.client = client;
  this.cursorName = cursorName;
  this.maxFetchSize = 200;
  this.closed = false;
  this.moreRowsAvailable = true;
  this.queryInProgress = false;
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
  self.client.query(fetch, [], function(err, result) {
    self.queryInProgress = false;
    if(err) {
      console.log('error fetching ' + err);
      self.emit('error', err);
      self.push(null);
      self.client = null;
      self.closed = true;
      return;
    }
    if(result.rows.length < fetchSize) {
      self.moreRowsAvailable = false;
    }
    result.rows.forEach(function(row) {
      self.push(row);
    });

    if(!self.moreRowsAvailable && !self.closed) {
      self.push(null);
      self.closed = true;
      var close = "CLOSE " + self.cursorName;
      winston.info("Closing cursor: %j", close, {});
      self.client.query(close, [], function() {});
      self.client = null;
      return;
    }
  });
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