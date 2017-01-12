"use strict";

var expat = require('node-expat')
var Readable = require('stream').Readable;
var util = require('util');

module.exports = function rawXmlStream(fileStream, oisTableName) {
  var parser = new expat.Parser('ISO-8859-1');

  let paused = false;

  function pause() {
    "use strict";
    if(!paused) {
      parser.pause();
      paused = true;
    }
  }

  function resume() {
    if(paused) {
      parser.resume();
      paused = false;
    }
  }
  util.inherits(ParseStream, Readable);
  function ParseStream() {
    Readable.call(this, { objectMode : true });
  }
  var objectsToRead = 0;
  ParseStream.prototype._read = function() {
    objectsToRead += 1;
    resume();
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
    }
  });
  parser.on('endElement', function(name) {
    if(name === currentField) {
      currentField = null;
    }
    else if (name === oisTableName) {
      parseStream.push(currentObj);
      currentObj = null;

      objectsToRead--;
      if(objectsToRead <= 0) {
        pause();
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
      if(!currentObj[currentField]) {
        currentObj[currentField] = '';
      }
      currentObj[currentField] += text;
    }
  });

  fileStream.pipe(parser);

  return parseStream;
};
