"use strict";
var csvStringify = require('csv-stringify');
var eventStream = require('event-stream');
var Transform        = require('stream').Transform;
var util             = require('util');
var pipeline = require('../../pipeline');

function jsonStringifyPretty(object){
  return JSON.stringify(object, undefined, 2);
}

util.inherits(JsonStringifyStream, Transform);
function JsonStringifyStream(replacer, space, sep) {
  Transform.call(this, {
    objectMode: true,
    highWaterMark: 0
  });
  this.replacer = replacer;
  this.space = space;
  this.headerWritten = false;
  this.sep = sep ? sep : { open: '[\n', separator: ',\n', close: '\n]'};
}

JsonStringifyStream.prototype._flush = function(cb) {
  if(!this.headerWritten) {
    this.push(this.sep.open);
  }
  this.push(this.sep.close);
  cb();
};

JsonStringifyStream.prototype._transform = function(chunk, encoding, cb) {
  var json = JSON.stringify(chunk, this.replacer, this.space);
  if(!this.headerWritten) {
    this.headerWritten = true;
    this.push(this.sep.open);
  }
  else {
    this.push(this.sep.separator);
  }
  this.push(json);
  cb();
};

var jsonSep = {
  open: '[\n',
  separator: ', ',
  close: '\n]'
};

function geojsonFeatureSep(crsUri) {
  return {
    open: '{\n' +
      '  "type": "FeatureCollection",\n' +
      '  "crs": {\n' +
      '    "type": "name",\n' +
      '    "properties": {"name": "' + crsUri + '"}\n'+
      '  },\n'+
      '  "features": [\n',
    separator: ', ',
    close: ']\n}'
  };
}

function jsonpSep(callbackName, sep) {
  return {
    open: callbackName +'(' + sep.open,
    separator: jsonSep.separator,
    close: sep.close + ');'
  };
}

function toGeoJsonUrn(srid) {
  return 'EPSG:' + srid;
}

function computeSeparator(formatParam, callbackParam, sridParam) {
  var sep = formatParam === 'geojson' ? geojsonFeatureSep(toGeoJsonUrn(sridParam)) : jsonSep;
  if (callbackParam) {
    sep = jsonpSep(callbackParam, sep);
  }
  return sep;
}

function transformToText(pipe, formatParam, callbackParam, sridParam) {
  var sep = computeSeparator(formatParam, callbackParam, sridParam);
  pipe.add(new JsonStringifyStream(undefined, 2, sep));
  return pipe;
}

// pipe stream to HTTP response. Invoke cb when done. Pass error, if any, to cb.
function streamToHttpResponse(pipe, res, cb) {
  pipe.toHttpResponse(res);
  pipe.completed().then(function() {
    cb(null);
  }, function(err) {
    cb(err);
  });
}

/**
 * Compute the appropriate Content-Type header based on the format and
 */
function contentHeader(format, jsonpCallbackName) {
  if(format === 'csv') {
    return 'text/csv; charset=UTF-8';
  }
  else if (jsonpCallbackName) {
    return "application/javascript; charset=UTF-8";
  }
  else {
    return 'application/json; charset=UTF-8';
  }
}

function setAppropriateContentHeader(res, format, callback) {
  res.setHeader('Content-Type', contentHeader(format, callback));
}


function streamCsvToHttpResponse(pipe, res, csvFieldNames, cb) {
  var csvStringifier = csvStringify({header: true, columns: csvFieldNames, rowDelimiter: '\r\n'});

  pipe.add(csvStringifier);
  streamToHttpResponse(pipe, res, cb);

}


exports.createStreamSerializer = function(formatParam, callbackParam, sridParam, representation) {
  formatParam = formatParam || 'json';
  sridParam = sridParam || 4326;
  return function(pipe, res, callback) {
    setAppropriateContentHeader(res, formatParam, callbackParam);
    if(formatParam === 'csv') {
      streamCsvToHttpResponse(pipe, res, representation.outputFields, callback);
    } else {
      transformToText(pipe, formatParam, callbackParam, sridParam);
      streamToHttpResponse(pipe, res, callback);
    }
  };
};

exports.createSingleObjectSerializer = function(formatParam, callbackParam, representation) {
  return function(res, object) {
    setAppropriateContentHeader(res, formatParam, callbackParam);
    if(formatParam === 'csv') {

      var stream = eventStream.readArray([object]);
      var pipe = pipeline(stream);
      streamCsvToHttpResponse(pipe, res, representation.outputFields, function() {});
    } else {
      var textObject = jsonStringifyPretty(object);
      if(callbackParam) {
        var sep = jsonpSep(callbackParam, {open: '', separator: '', close: ''});
        res.write(sep.open);
        res.write(textObject);
        res.end(sep.close);
      }
      else {
        res.end(textObject);
      }
    }
  };
};