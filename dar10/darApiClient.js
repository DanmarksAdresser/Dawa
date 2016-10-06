"use strict";

const url = require('url');
const request = require('request-promise');

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
        const statusUrl = baseUrl + '/Status';
        return  request.get({uri: statusUrl, json: true});
      },
    getRecordsPage: (eventStart, eventSlut, entitet, startindeks) => {
      const queryUrl = exports.recordsUrl(baseUrl, eventStart, eventSlut, entitet, startindeks);
      return request.get({
        uri: queryUrl,
        json: true
      });
    }
  };
};
