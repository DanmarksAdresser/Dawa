"use strict";

/*eslint no-console: 0 */
var cliParameterParsing = require('./bbr/common/cliParameterParsing');
var request = require('request-promise');
var Writable = require('stream').Writable;
var util = require('util');

var http = require('http');

const q = require('q');

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
  function getToDevNull() {
    return q.Promise((resolve, reject) => {
      var requestStream = request(baseUrl + path);
      console.log('started request stream');
      const devNull = new DevNull();
      requestStream.pipe(devNull);
      requestStream.on('error', () => {
        console.log('stream error');
        reject();
      });
      requestStream.on('end', () =>  {
        console.log('stream end');
        resolve();
      });
    });
  }
  for(let i = 0; i < parallelCount; ++i) {
    console.log('launching ' + path)
    q.async(function*() {
      /* eslint no-constant-condition: 0 */
      while(true) {
        try {
          yield getToDevNull();
        }
        catch(e) {
          console.log('ERROR', e);
        }
      }

    })();
  }
}
cliParameterParsing.main(optionSpec, Object.keys(optionSpec), function(args, options) {
  var baseUrl = options.baseUrl;
  getRepeatedly(baseUrl, '/adresser', options.adresseStreams),
  getRepeatedly(baseUrl, '/adgangsadresser', options.adgangsadresseStreams),
  getRepeatedly(baseUrl, '/vejstykker', options.vejstykkeStreams),
  getRepeatedly(baseUrl, '/vejnavne', options.vejnavnStreams),
  getRepeatedly(baseUrl, '/postnumre', options.postnummerStreams),
  getRepeatedly(baseUrl, '/regioner?format=geojson', options.regionerStreams),
  getRepeatedly(baseUrl, '/replikering/adgangsadresser', options.adgangsadresseUdtraekStreams)

  q.async(function*() {
    /* eslint no-constant-condition: 0 */
    while(true) {
      try {
        var before = Date.now();
        const response = yield request( {
          uri: baseUrl + '/adresser/autocomplete?q=' + randomString(2),
          resolveWithFullResponse: true
        });
        console.log('autocomplete status: ' + response.statusCode + ' time: ' + (Date.now() - before));
      }

      catch(e) {
        console.log('could not get autocomplete response');
      }
    }
  })();
});
