"use strict";

/* eslint no-console: 0 */
/* eslint no-constant-condition: 0 */

const fs = require('fs');
const byline = require('byline');
const q = require('q');
const querystring = require('querystring');
const request = require('request-promise');
const _ = require('underscore');
const Writable = require('stream').Writable;

var cliParameterParsing = require('./bbr/common/cliParameterParsing');

var optionSpec = {
  baseUrl: [false, 'URL på dawa service', 'string', 'http://127.0.0.1:3000'],
  requestsFile: [false, 'Fil med CloudFront log fra splunk', 'string']
};

class Reader extends Writable {
  constructor(options) {
    super(_.assign({}, options, {objectMode: true}));
    this.deferred = null;
    this.obj = null;
    this.ended = false;
    this.errored = false;

    this.on('end', () => {
      this.ended = true;
      if(this.deferred) {
        this.deferred.resolve(null);
        this.deferred = null;
      }
    });
    this.on('error', err => {
      this.errored = true;
      this.obj = err;
      if(this.deferred) {
        this.deferred.reject(err);
        this.deferred = null;
      }
    });
  }

  read() {
    if(this.deferred) {
      throw new Error('read already in progress');
    }
    if(this.ended) {
      return q.resolve(null);
    }
    if(this.errored) {
      return q.reject(this.obj);
    }
    if(this.obj) {
      const obj = this.obj;
      this.obj = null;
      const callback = this.callback;
      this.callback = null;
      callback();
      return q.resolve(obj);
    }
    this.deferred = q.defer();
    return this.deferred.promise;
  }

  _write(object, encoding, callback) {
    if(this.deferred) {
      this.deferred.resolve(object);
      this.deferred = null;
      callback();
    }
    else {
      this.obj = object;
      this.callback = callback;
    }
  }

}

cliParameterParsing.main(optionSpec, Object.keys(optionSpec), function (args, options) {
  const baseUrlLocal = options.baseUrl;
  const baseUrlProd = 'http://dawa.aws.dk';

  const requestStream = byline(fs.createReadStream(options.requestsFile, {encoding: 'utf8'}));
  const reader = new Reader();
  requestStream.pipe(reader);
  q.async(function*() {
    let count = 0;
    while(true) {
      const line = yield reader.read();
      if(!line) {
        break;
      }
      const loggedRequest = JSON.parse(line).result;
      if(loggedRequest.x_edge_result_type === 'Error') {
        continue;
      }
      if(parseInt(loggedRequest.sc_bytes > 10000 )) {
        continue;
      }
      let path = loggedRequest.cs_uri_stem;
      if(path.substring(0, 2) === '//') {
        path = path.substring(1);
      }
      if(path.startsWith('/autocomplete')) {
        const parsedQuery = querystring.parse(loggedRequest.cs_uri_query);
        if(!parsedQuery.q || parsedQuery.q.indexOf('%') !== -1
        || parsedQuery.q.indexOf('*') !== -1) {
          continue;
        }
        delete parsedQuery.callback;
        delete parsedQuery.format;
        const correctedQueryString = querystring.stringify(parsedQuery);
        const stringUrl = path + '?' + correctedQueryString;
        const request1 = request({url: baseUrlLocal + stringUrl, json: true});
        const request2 = request({url: baseUrlProd + stringUrl, json: true});
        const result1 = yield request1;
        const result2 = yield request2;
        const textResults1 = result1.map(obj => obj.tekst).slice(0,3);
        const textResults2 = result2.map(obj => obj.tekst).slice(0,3);
        let queryText = parsedQuery.q;
        const caretpos = parsedQuery.caretpos;
        if(caretpos) {
          const pos = parseInt(caretpos);
          queryText = [queryText.slice(0, pos), '|', queryText.slice(pos)].join('');

        }
        if(JSON.stringify(textResults1) !== JSON.stringify(textResults2)) {
          if(textResults1.length === 0 || textResults2.length === 0) {
            console.log('');
            console.log('==== SØGNING ====: ' + queryText);
            console.log('One length was zero: ' + textResults1.length + ' ' + textResults2.length);
          }
          else if(result1[0].type !== result2[0].type) {
            // console.log('type was different: ' + result1[0].type + ' ' + result2[0].type);
          }
          else {
            console.log('');
            console.log('==== SØGNING ====: ' + queryText);
            console.log('result order was different:');
            for(let result of textResults1) {
              console.log(result);
            }
            console.log('--------');
            for(let result of textResults2) {
              console.log(result);
            }
          }
        }
      }

    }
    console.log(count);
  })().done();

});

