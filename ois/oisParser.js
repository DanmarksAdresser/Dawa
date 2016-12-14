"use strict";

var es = require('event-stream');
var expat = require('node-expat')
var Readable = require('stream').Readable;
var util = require('util');

var fieldParsers = require('./fieldParsers');

function rawXmlStream(fileStream, oisTableName) {
  var parser = new expat.Parser('ISO-8859-1');

  util.inherits(ParseStream, Readable);
  function ParseStream() {
    Readable.call(this, { objectMode : true });
  }
  var objectsToRead = 0;
  ParseStream.prototype._read = function() {
    objectsToRead += 1;
    parser.resume();
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
        parser.pause();
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
}

// Parse an OIS XML file into a stream of javascript objects
exports.oisStream = function(sourceStream, oisModel) {
  var xmlStream = rawXmlStream(sourceStream, oisModel.oisTable);
  var transformer = es.mapSync(function(rawObject) {
    return oisModel.fields.reduce(function(memo, field) {
      var rawValue = rawObject[field.name];
      var parsedValue;
      try {
        parsedValue = fieldParsers[field.oisType](rawValue);
      }
      catch(e) {
        throw new Error('Field ' + field.name + ' contained invalid value ' + rawValue + '. Object: ' + JSON.stringify(rawObject));
      }
      memo[field.name] = parsedValue;
      return memo;
    }, {});
  });
  return xmlStream.pipe(transformer);
};

exports.internal = {
  rawXmlStream: rawXmlStream
};
