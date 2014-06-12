"use strict";

var Q = require('q');
var stream = require('stream');
var eventStream = require('event-stream');
var util = require('util');

util.inherits(MapperStream, stream.Transform);
function MapperStream(mapFunc) {
  this.mapFunc = mapFunc;
  stream.Transform.call(this, {objectMode: true, highWaterMark: 0});
}
MapperStream.prototype._transform = function(chunk, enc, cb) {
  this.push(this.mapFunc(chunk));
  cb();
};

// This class is a utility for setting up a pipeline which streams data from the database
// to the HTTP response. It encapsulates error handling, and may return a promise which will
// be resolved when the streaming is completed (the purpose of which is primarily to release
// the DB connection).
module.exports = function(readableStream) {
  var completionDeferred = Q.defer();
  var lastStream = readableStream;
  var httpResponseStream;
  function onError(err) {
    if(!completionDeferred.promise.isPending()) {
      return;
    }
    completionDeferred.reject(err);
    if(httpResponseStream) {
      httpResponseStream.socket.destroy();
    }
  }
  readableStream.on('error', onError);
  return {
    add: function(writableStream) {
      writableStream.on('error', onError);
      lastStream = lastStream.pipe(writableStream);
    },
    map: function(mapFunc) {
      this.add(new MapperStream(mapFunc));
    },
    toHttpResponse: function(res) {
      httpResponseStream = res;

      // this is absolutely necessary, if the connection is already closed,
      // 'finish' and 'close' events will never be emitted,
      // and cleanup will never happen
      if(!res.connection.writable) {
        completionDeferred.reject(new Error('Cannot pipe to HTTP response, connection no longer writable'));
        return;
      }
      res.on('finish', function() {
        completionDeferred.resolve();
      });
      res.on('close', function() {
        completionDeferred.reject(new Error('HTTP client closed connection'));
      });
      this.add(res);
    },
    toArray: function(callback) {
      eventStream.writeArray(function(err, result) {
        if(err) {
          return completionDeferred.reject(err);
        }
        completionDeferred.resolve();
        callback(err, result);
      });
    },
    completed: function() {
      return completionDeferred.promise;
    }
  };
};