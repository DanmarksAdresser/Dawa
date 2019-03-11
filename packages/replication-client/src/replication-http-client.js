"use strict";
const requestPromise = require('request-promise');
const request = require('request');
const split2 = require('split2');
const cspUtil = require('@dawadk/common/src/csp-util');

const URI = require('urijs');


const ndjsonStream = (url, dstChan, batchSize, headers) => {
  const stream = request({url, headers}).pipe(split2(JSON.parse));
  return cspUtil.pipeFromStream(stream, dstChan, batchSize);
};

const getUdtraekUrl = (baseurl, entityName, remoteTxid) => {
  const url = new URI(baseurl);
  url.segment('udtraek');
  url.addQuery('entitet',  entityName);
  url.addQuery('txid',  remoteTxid);
  url.addQuery('ndjson');
  return url.toString();
};

const getEventUrl = (baseurl, entityName, txidFrom, txidTo) => {
  const url = new URI(baseurl);
  url.segment('haendelser');
  url.addQuery('entitet',  entityName);
  url.addQuery('txidfra',  txidFrom);
  url.addQuery('txidtil',  txidTo);
  url.addQuery('ndjson');
  return url.toString();
};

const getSenesteTransaktionUrl = baseUrl => {
  const url = new URI(baseUrl);
  url.segment('senestetransaktion');
  return url.toString();
};

const getDatamodelUrl = baseUrl => {
  const url = new URI(baseUrl);
  url.segment('datamodel');
  return url.toString();
};

class ReplicationHttpClient {
  constructor(baseUrl, {batchSize, userAgent}) {
    this.baseUrl = baseUrl;
    this.batchSize = batchSize || 200;
    this.headers = {'User-Agent': userAgent}
  }


  lastTransaction() {
    const url = getSenesteTransaktionUrl(this.baseUrl);
    return requestPromise({url, headers: this.headers, json: true});
  }

  datamodel() {
    const url = getDatamodelUrl(this.baseUrl);
    return requestPromise({url, headers: this.headers, json: true});
  }

  downloadStream(entityName, remoteTxid, dstChan) {
    const url = getUdtraekUrl(this.baseUrl, entityName, remoteTxid);
    return ndjsonStream(url, dstChan, this.batchSize, this.headers);
  }
  eventStream(entityName, txidFrom, txidTo, dstChan) {
    const url = getEventUrl(this.baseUrl, entityName, txidFrom, txidTo);
    return ndjsonStream(url, dstChan, this.batchSize, this.headers);
  }
}

module.exports = {ReplicationHttpClient};