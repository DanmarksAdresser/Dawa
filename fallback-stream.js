"use strict";

var Stream = require('stream');

/**
 * Take a stream. If the stream produces no data, use the supplied function to
 * create a fallback stream, which is used instead.
 */
module.exports = function(stream, createFallbackStreamFn) {
  var out = new Stream.PassThrough({
    objectMode: true
  });
  var switchToFallback = function() {
    createFallbackStreamFn(function(err, fallbackStream) {
      if(err) {
        return out.emit('error', err);
      }
      fallbackStream.pipe(out);
      fallbackStream.on('error', function(err) {
        out.emit('error', err);
      });
    });
  };
  stream.once('data', function(data) {
    stream.removeListener('end', switchToFallback);
    out.write(data);
    stream.pipe(out);
  });
  stream.on('error', function(err) {
    stream.removeListener('end', switchToFallback);
    out.emit('error', err);
  });
  stream.once('end', switchToFallback);
  return out;
};
