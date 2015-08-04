"use strict";

var Stream = require('stream');

/**
 * Take a stream. If the stream produces no data, use the supplied function to
 * create a fallback stream, which is used instead.
 */
module.exports = function(stream, createFallbackStreamFn) {
  console.log('creating pass through stream');
  var out = new Stream.PassThrough({
    objectMode: true
  });
  console.log('func');
  var switchToFallback = function() {
    console.log('SWITCHING TO FALLBACK');
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
  console.log('adding data listener');
  stream.once('data', function(data) {
    console.log('got a piece of data!');
    stream.removeListener('end', switchToFallback);
    out.write(data);
    console.log('piping the data');
    stream.pipe(out);
    stream.on('end', function() {
      console.log('stream ended!');
    });
  });
  stream.on('error', function(err) {
    stream.removeListener('end', switchToFallback);
    out.emit('error', err);
  });
  stream.once('end', switchToFallback);
  return out;
};