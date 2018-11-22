"use strict";

const url = require('url');
const request = require('request-promise');
const logger = require('@dawadk/common/src/logger').forCategory('dar10ApiClient');

exports.recordsUrl = (baseUrl, eventStart, eventSlut, entitet, startindeks) => {
  const parsedUrl = url.parse(baseUrl +  '/Records', true);
  parsedUrl.query.Eventstart = eventStart;
  parsedUrl.query.Eventslut = eventSlut;
  parsedUrl.query.Entitet = entitet;
  if(startindeks) {
    parsedUrl.query.Startindeks=startindeks;
  }
  return url.format(parsedUrl);
};

exports.createClient = (baseUrl)  => {

  return {
    getEventStatus: () => {
      logger.info('Getting DAR 1.0 status');
        const statusUrl = baseUrl + '/Status';
        return  request.get({uri: statusUrl, json: true});
      },
    getRecordsPage: (eventStart, eventSlut, entitet, startindeks) => {
      const queryUrl = exports.recordsUrl(baseUrl, eventStart, eventSlut, entitet, startindeks);
      logger.info('Getting DAR 1.0 entities', {url: queryUrl});
      return request.get({
        uri: queryUrl,
        json: true
      });
    }
  };
};
