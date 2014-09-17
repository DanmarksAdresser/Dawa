"use strict";

var Q = require('q');
var stream = require('stream');
var eventStream = require('event-stream');
var util = require('util');

// MapperStream is a simple transform stream which apply a synchronous mapping
// function to every object in the stream
util.inherits(MapperStream, stream.Transform);
function MapperStream(mapFunc) {
  this.mapFunc = mapFunc;
  stream.Transform.call(this, {objectMode: true, highWaterMark: 0});
}
MapperStream.prototype._transform = function(chunk, enc, cb) {
  this.push(this.mapFunc(chunk));
  cb();
};

// This is a utility for setting up a pipeline which streams data from the database
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
    // The add function adds another transform stream to the pipeline
    add: function(writableStream) {
      writableStream.on('error', onError);
      lastStream = lastStream.pipe(writableStream);
    },
    // Add a simple transformer which performs a simple, synchrononous mapping of the objects in the stream
    map: function(mapFunc) {
      this.add(new MapperStream(mapFunc));
    },

    // Pipe to a HTTP response. The promise returned by the promise returned by completed() will
    // be resolved when all data has been delivered to the HTTP response stream. If an error occurs,
    // the promise will be rejected.
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

    // Convert the pipeline stream to an array. Don't do this on large streams.
    toArray: function(callback) {
      var arrayStream = eventStream.writeArray(function(err, result) {
        if(err) {
          completionDeferred.reject(err);
          return callback(err);
        }
        completionDeferred.resolve();
        callback(err, result);
      });
      this.add(arrayStream);
    },

    // return a promise which will be resolved when all the data in the pipeline has been delivered to a HTTP response
    // or converted to an array.
    completed: function() {
      return completionDeferred.promise;
    }
  };
};