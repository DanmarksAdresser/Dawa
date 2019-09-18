"use strict";

var expat = require('node-expat')
var Readable = require('stream').Readable;
var util = require('util');

module.exports = function rawXmlStream(fileStream, oisTableName) {
  var parser = new expat.Parser('ISO-8859-1');
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
  parser.on('startElement', function(name) {
    if(name === oisTableName) {
      currentObj = {};
    }
    else if (currentObj && !currentField) {
      currentField = name;
      currentObj[currentField] = '';
    }
  });
  parser.on('endElement', function(name) {
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
