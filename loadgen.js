"use strict";

/*eslint no-console: 0 */
var async = require('async');
var cliParameterParsing = require('./bbr/common/cliParameterParsing');
var request = require('request-promise');
var Writable = require('stream').Writable;
var util = require('util');

var http = require('http');

http.globalAgent.maxSockets = 5000;

var optionSpec = {
  baseUrl: [false, 'URL på dawa service', 'string', 'http://127.0.0.1:3000'],
  adresseStreams: [false, 'Antal samtidige requests til /adresser', 'number', 2],
  adgangsadresseStreams: [false, 'Antal samtidige requests til /adgangsadresser', 'number', 2],
  vejstykkeStreams: [false, 'Antal samtidige requests til /vejstykker', 'number', 2],
  vejnavnStreams: [false, 'Antal samtidige requests til /vejnavne', 'number', 2],
  postnummerStreams: [false, 'Antal samtidige requests til /postnumre', 'number', 2],
  regionerStreams: [false, 'Antal samtidige requests til /regioner?format=geojson', 'number', 2],
  adgangsadresseUdtraekStreams: [false, 'Antal samtidige requests til /replikering/adgangsadresser', 'number', 2],
  adresseAutocompletePerSecond: [false, 'Antal kald til autocomplete pr. sekund', 'number', 5]
};

util.inherits(DevNull, Writable);

function DevNull (opts) {
  if (!(this instanceof DevNull)) return new DevNull(opts);

  opts = opts || {};
  Writable.call(this, opts);
}

DevNull.prototype._write = function (chunk, encoding, cb) {
  cb();
};

var alwaysTrue = function() { return true; };


var chars = 'abcdefghijklmnopqrstuvwxyzæøåé';

function randomString(length) {
  length = length ? length : 32;

  var string = '';

  for (var i = 0; i < length; i++) {
    var randomNumber = Math.floor(Math.random() * chars.length);
    string += chars.substring(randomNumber, randomNumber + 1);
  }

  return string;
}

function getRepeatedly(baseUrl, path, parallelCount) {
  return function (errorCallback) {
    function getToDevNull(callback) {
      var requestStream = request(baseUrl + path);
      requestStream.pipe(new DevNull());
      requestStream.on('error', function(err) {
        callback(err);
      });
      requestStream.on('end', function(err) {
        callback(err);
      });
    }
    var count = 0;
    async.whilst(function() {
      return count < parallelCount;
    }, function(callback) {
      count++;
      console.log('getting ' + path);
      async.whilst(alwaysTrue, getToDevNull, errorCallback);
      setTimeout(callback, 1000);
    }, function(err) {
      if(err) {
        throw err;
      }
    });
  };
}
cliParameterParsing.main(optionSpec, Object.keys(optionSpec), function(args, options) {
  var baseUrl = options.baseUrl;
  async.parallel([
    getRepeatedly(baseUrl, '/adresser', options.adresseStreams),
    getRepeatedly(baseUrl, '/adgangsadresser', options.adgangsadresseStreams),
    getRepeatedly(baseUrl, '/vejstykker', options.vejstykkeStreams),
    getRepeatedly(baseUrl, '/vejnavne', options.vejnavnStreams),
    getRepeatedly(baseUrl, '/postnumre', options.postnummerStreams),
    getRepeatedly(baseUrl, '/regioner?format=geojson', options.regionerStreams),
    getRepeatedly(baseUrl, '/replikering/adgangsadresser', options.adgangsadresseUdtraekStreams)
  ], function(err) {
    if(err) {
      throw err;
    }
  });
  setInterval(function() {
    var before = Date.now();
    request(baseUrl + '/adresser/autocomplete?q=' + randomString(2), function(err, response, body) {
      if(err) {
        throw err;
      }
      console.log('autocomplete status: ' + response.statusCode + ' time: ' + (Date.now() - before));
    });
  }, 1000 / options.adresseAutocompletePerSecond);
});
