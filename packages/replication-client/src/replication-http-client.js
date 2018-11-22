"use strict";
const request = require('request-promise');
const split2 = require('split2');
const cspUtil = require('@dawadk/common/src/csp-util');

const URI = require('urijs');


const ndjsonStream = (url, dstChan, batchSize) => {
  const stream = request(url).pipe(split2(JSON.parse));
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

class ReplicationHttpClient {
  constructor(baseUrl, batchSize) {
    this.baseUrl = baseUrl;
    this.batchSize = batchSize;
  }

  lastTransaction() {
    const url = getSenesteTransaktionUrl(this.baseUrl);
    return request({url, json: true});
  }

  downloadStream(entityName, remoteTxid, dstChan) {
    const url = getUdtraekUrl(this.baseUrl, entityName, remoteTxid);
    return ndjsonStream(url, dstChan, this.batchSize);
  }
  eventStream(entityName, txidFrom, txidTo, dstChan) {
    const url = getEventUrl(this.baseUrl, entityName, txidFrom, txidTo);
    return ndjsonStream(url, dstChan, this.batchSize);
  }
}

module.exports = {ReplicationHttpClient};