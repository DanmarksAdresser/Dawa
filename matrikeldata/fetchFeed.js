/*jslint assignment: true */
"use strict";

var FeedParser = require('feedparser');
var http = require('http');
var cliParameterParsing = require('../bbr/common/cliParameterParsing');
var ejerlav = require('./ejerlav.js');
var moment = require('moment');
var _ = require('underscore');
var async = require('async');
var logger = require('../logger').forCategory('fetchFeed');

var feedMeta;
var updatedEjerlav = [];

var optionSpec = {
  pgConnectionUrl: [false, 'URL som anvendes ved forbindelse til databasen', 'string'],
  feedUrl: [false, 'URL til webservice hvor DAGI temaerne hentes fra', 'string', 'http://kortforsyningen.kms.dk/service?servicename=dagi_gml2'],
  matrikelUsername: [false, 'Brugernavn til webservicen hvor matrikelfeedet hentes fra', 'string', 'dawa'],
  matrikelPassword: [false, 'Password til webservicen hvor matrikelfeedet hentes fra', 'string']
};

cliParameterParsing.main(optionSpec, _.keys(optionSpec), function (args, options) {
  process.env.pgConnectionUrl = options.pgConnectionUrl;

  // we need to set the pgConnectionUrl before importing the dbapi, so we import it here
  // var dbapi = require('./../dbapi');

  var feedUrl = options.dagiUrl || 'http://download.kortforsyningen.dk/sites/default/files/feeds/MATRIKELKORT_GML.xml';
  var username = options.matrikelUsername || 'dawa';
  var password = options.matrikelPassword;

  var lastUpdated = moment("2015-01-21T00:39:50.000Z"); // TODO this is for now a made up lastUpdated, we need to persist it

  http.get(feedUrl, function(res) {
    res.pipe(new FeedParser({}))
      .on('error', function(error) {
        throw 'Unable to parse feed: ' + error;
      })
      .on('meta', function(meta) {
        feedMeta = meta;
      })
      .on('readable', function() {
        var stream = this, item, itemPubdate;
        while (null !== (item = stream.read())) {
          // Each 'readable' event will contain 1 feed entry, ie. an ejerlav
          itemPubdate = moment(item.pubDate, moment.ISO_8601, true);
          if (itemPubdate.isAfter(lastUpdated)) {
            updatedEjerlav.push({
              title: item.title,
              link: item.link,
              publicationDate: itemPubdate
            });
            logger.info("Modified ejerlav %d added" + JSON.stringify(updatedEjerlav[updatedEjerlav.length-1]), updatedEjerlav.length);
          } else {
            logger.debug("Ignored unmodified ejerlav with pubDate " + itemPubdate.format());
          }
        }
      })
      .on('end', function() {
        logger.info("Fandt " + updatedEjerlav.length + " opdaterede ejerlav siden %s", lastUpdated.format());
        async.eachSeries(updatedEjerlav, function(anUpdatedEjerlav, asyncCallback) {
            ejerlav.processEjerlav(anUpdatedEjerlav.link, username, password, options, asyncCallback);
        }, function (err) {
          if(err) {
            logger.error('Indlæsning af matrikeldata fejlet', err);
            process.exit(1);
          } else {
            logger.info('Indlæsning af matrikeldata gennemført', { updatedEjerlav: updatedEjerlav.map(function(ejerlav) { return ejerlav.title; })});
          }
        });
      });
  }).on('error', function(error) {
    throw 'Unable to fetch from ' + feedUrl + ': ' + error;
  });
});