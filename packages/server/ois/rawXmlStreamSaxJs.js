"use strict";
const sax = require('sax');
const iconv = require('iconv-lite');
const Readable = require('stream').Readable;
const util = require('util');


module.exports = function rawXmlStream(fileStream, oisTableName) {
  const parserStream = sax.createStream(true);

  util.inherits(ParseStream, Readable);
  function ParseStream() {
    Readable.call(this, { objectMode : true });
  }

  ParseStream.prototype._read = function() {
    fileStream.resume();
  };

  var parseStream = new ParseStream();

  var currentObj;
  var currentField;
  parserStream.on('opentag', function(node) {
    if(node.name === oisTableName) {
      currentObj = {};
    }
    else if (currentObj && !currentField) {
      currentField = node.name;
      currentObj[currentField] = '';
    }
  });
  parserStream.on('closetag', function(name) {
    if(name === currentField) {
      currentField = null;
    }
    else if (name === oisTableName) {
      const result = parseStream.push(currentObj);
      currentObj = null;
      if(!result) {
        fileStream.pause();
      }
    }
  });

  parserStream.on('end', function() {
    parseStream.push(null);
  });

  parserStream.on('error', function(err) {
    parseStream.emit('error', err);
  });

  parserStream.on('text', function(text){
    if(currentField) {
      // for some reason, text content of a node may be split into
      // multiple text events, so we need to merge them together.
      currentObj[currentField] += text;
    }
  });

  const textStream = iconv.decodeStream('ISO-8859-1');

  fileStream.pipe(textStream).pipe(parserStream);

  return parseStream;
};
