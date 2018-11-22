"use strict";

/* eslint no-console: 0 */
/* eslint no-constant-condition: 0 */

const fs = require('fs');
const byline = require('byline');
const http = require('http');
const q = require('q');
const url = require('url');
const _ = require('underscore');
const Writable = require('stream').Writable;

q.longStackSupport = true;

var cliParameterParsing = require('../bbr/common/cliParameterParsing');
const logger = require('@dawadk/common/src/logger').forCategory('loadtest');

var optionSpec = {
  baseUrl: [false, 'URL på dawa service', 'string', 'http://127.0.0.1:3000'],
  requestsFile: [false, 'Fil med CloudFront log fra splunk', 'string'],
  concurrency: [false, 'Number of concurrent requests', 'number', 1]
};

const keepAliveAgent = new http.Agent({ keepAlive: true,  });

const performRequest = (options) => {
  options = Object.assign({}, options, {agent: keepAliveAgent});
  return q.Promise((resolve, reject) => {
    const before = Date.now();
    let byteCount = 0;
    http.get(options, res => {
      res.on('data', chunk => {
        byteCount += chunk.byteLength;
      });
      res.on('error', reject);
      res.on('end', () => {
        resolve({
          duration: Date.now() - before,
          byteCount: byteCount
        });
      });
    }).on('error', reject);
  });
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

function fetchLoop(baseUrl, reader) {
  q.async(function*() {
    let count = 0;
    while(true) {
      const line = yield reader.read();
      if(!line) {
        break;
      }
      const request = JSON.parse(line).result;
      if(request.x_edge_result_type === 'Error') {
        continue;
      }
      if(parseInt(request.sc_bytes > 1000000 )) {
        continue;
      }
      let path = request.cs_uri_stem;
      if(path.substring(0, 2) === '//') {
        path = path.substring(1);
      }
      const stringUrl = path + '?' + request.cs_uri_query;
      const parsedUrl = url.parse(url.resolve(baseUrl, stringUrl));
      try {
        const result = yield performRequest(parsedUrl);

        logger.info('Stat', {
          path: path,
          query: request.cs_uri_query,
          duration: result.duration,
          byteCount: result.byteCount

        });
      }
      catch(err) {
        logger.info('Error', err);
      }
      count++;
      yield q.delay(500);
    }
    console.log(count);
  })().done();
}

cliParameterParsing.main(optionSpec, Object.keys(optionSpec), function (args, options) {
  q.async(function*() {
    const baseUrl = options.baseUrl;

    for(let i = 0; i < options.concurrency; ++i) {
      const requestStream = byline(fs.createReadStream(options.requestsFile, {encoding: 'utf8'}));
      const reader = new Reader();
      requestStream.pipe(reader);
      fetchLoop(baseUrl, reader);
      yield q.delay(10000);
    }
  })().done();
});

