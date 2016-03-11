"use strict";

// CursorStream his is an implementation of a NodeJS stream which is backed by a PostgreSQL Cursor.


var util = require('util');
var Readable    = require('stream').Readable;
var logger = require('./logger').forCategory('cursorStream');

util.inherits(CursorStream, Readable);
function CursorStream(client, cursorName, query) {
  var self = this;
  self.transactionEndListener = function (err) {
    self._close(new Error('Transaction ended unexpectedly', err));
  };
  Readable.call(this, {
    objectMode: true,
    highWaterMark: 400
  });
  this.client = client;
  this.cursorName = cursorName;
  this.query = query;
  this.maxFetchSize = 200;
  this.closed = false;
  this.moreRowsAvailable = true;
  this.queryInProgress = false;

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
  self.client.queryp(fetch).then(result => {
    if(self.closed) {
      return;
    }
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
  }, err => {
    self._close(err);
  });
};

CursorStream.prototype._close = function(err) {
  var self = this;
  if(self.closed) {
    return;
  }
  self.client.removeListener('transactionEnd', self.transactionEndListener);
  if(err) {
    logger.error('Cursor closed due to error', {
      error: err
    });
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
    self.client.query(close, [], function(err) {
      if(err) {
        logger.error('could not close cursor', err);
      }
    });
    self.client = null;
    return;
  }
};

CursorStream.prototype._read = function(count) {
  var self = this;
  if(self.closed) {
    logger.info('attempted read from a closed source');
    return;
  }
  if(!self.queryInProgress) {
    self._doFetch(count);
  }
};

module.exports = CursorStream;
