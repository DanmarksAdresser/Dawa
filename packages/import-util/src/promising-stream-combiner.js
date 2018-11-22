"use strict";

const Promise = require('bluebird');

/**
 * Create a pipeline of streams. Returns a promise, which
 * is resolved when all data is sent through all the streams.
 * @param streams
 * @returns {*}
 */
module.exports = function promisingStreamCombiner(streams) {
  return new Promise(function(resolve, reject) {
    streams.reduce((memo, stream) => memo.pipe(stream));
    streams.forEach(function(stream) {
      stream.on('error', reject);
    });
    const lastStream = streams[streams.length-1];
    if(lastStream.readable) {
      streams[streams.length-1].on('end', resolve);
    }
    else {
      streams[streams.length-1].on('finish', resolve);
    }
  });
};
