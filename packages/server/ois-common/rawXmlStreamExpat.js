"use strict";

var expat = require('node-expat')
var Readable = require('stream').Readable;
var util = require('util');

module.exports = function rawXmlStream(fileStream) {
  var parser = new expat.Parser('ISO-8859-1');
  util.inherits(ParseStream, Readable);
  function ParseStream() {
    Readable.call(this, { objectMode : true });
  }
  ParseStream.prototype._read = function() {
    fileStream.resume();
  };

  var parseStream = new ParseStream();
  let depth = 0;
  var currentObj;
  var currentField;
  parser.on('startElement', function(name) {
    ++depth;
    if(depth === 2) {
      currentObj = {};
    }
    else if (currentObj && !currentField) {
      currentField = name;
      currentObj[currentField] = '';
    }
  });
  parser.on('endElement', function(name) {
    --depth;
    if(name === currentField) {
      currentField = null;
    }
    else if (depth === 1) {
      const result = parseStream.push(currentObj);
      if(!result) {
        fileStream.pause();
      }
      currentObj = null;
    }
  });

  parser.on('end', function() {
    parseStream.push(null);
  });

  parser.on('error', function(err) {
    parseStream.emit('error', err);
  });

  parser.on('text', function(text){
    if(currentField) {
      // for some reason, text content of a node may be split into
      // multiple text events, so we need to merge them together.
      currentObj[currentField] += text;
    }
  });

  fileStream.pipe(parser);

  return parseStream;
};
