/*jslint assignment: true */
"use strict";

var FeedParser = require('feedparser');
var http = require('http');
var cliParameterParsing = require('../bbr/common/cliParameterParsing');
var ejerlav = require('./ejerlav.js');
var moment = require('moment');
var _ = require('underscore');

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

  var lastUpdated = moment("2014-12-09T00:23:09.000Z"); // TODO this is for now a made up lastUpdated, we need to persist it

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
            console.log("Ejerlav %d added: %s", updatedEjerlav.length, JSON.stringify(updatedEjerlav[updatedEjerlav.length-1]));
          } else {
            console.log("Ignored ejerlav with pubDate %s", itemPubdate);
          }
        }
      })
      .on('end', function() {
        console.log("Found %d updated ejerlav since %s", updatedEjerlav.length, lastUpdated);
        _.each(updatedEjerlav, function(updatedEjerlav) {
          ejerlav.processEjerlav(updatedEjerlav.link, username, password);
        });
      });
  }).on('error', function(error) {
    throw 'Unable to fetch from ' + feedUrl + ': ' + error;
  });
});