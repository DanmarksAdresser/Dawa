/*jslint assignment: true */
"use strict";

var FeedParser = require('feedparser');
var http = require('http');
var cliParameterParsing = require('../bbr/common/cliParameterParsing');
var ejerlav = require('./ejerlav.js');
var _ = require('underscore');

var feedMeta;
var updatedEjerlav = [];

var optionSpec = {
  pgConnectionUrl: [false, 'URL som anvendes ved forbindelse til databasen', 'string'],
  feedUrl: [false, 'URL til webservice hvor DAGI temaerne hentes fra', 'string', 'http://kortforsyningen.kms.dk/service?servicename=dagi_gml2'],
  username: [false, 'Brugernavn til webservicen hvor matrikelfeedet hentes fra', 'string', 'dawa'],
  password: [false, 'Password til webservicen hvor matrikelfeedet hentes fra', 'string']
};

cliParameterParsing.main(optionSpec, _.keys(optionSpec), function (args, options) {
  process.env.pgConnectionUrl = options.pgConnectionUrl;

  // we need to set the pgConnectionUrl before importing the dbapi
  // var dbapi = require('./../dbapi');

  var feedUrl = options.dagiUrl || 'http://download.kortforsyningen.dk/sites/default/files/feeds/MATRIKELKORT_GML.xml';
  var username = options.username || 'dawa';
  var password = options.password;

  http.get(feedUrl, function(res) {
    res.pipe(new FeedParser({}))
      .on('error', function(error) {
        throw 'Unable to parse feed: ' + error;
      })
      .on('meta', function(meta) {
        feedMeta = meta;
      })
      .on('readable', function() {
        var stream = this, item;
        while (null !== (item = stream.read())) {
          // Each 'readable' event will contain 1 feed entry, ie. an ejerlav
          updatedEjerlav.push({
            'title': item.title,
            'link': item.link,
            'publicationDate': item.pubDate

          });
          console.log("Ejerlav %d: %s", updatedEjerlav.length, JSON.stringify(updatedEjerlav[updatedEjerlav.length-1]));
        }
      })
      .on('end', function() {
        var result = {
          'feedName': feedMeta.title,
          "count": updatedEjerlav.length
        };

        console.dir(result);

        _.each(updatedEjerlav.slice(0,5), function(updatedEjerlav) {
          ejerlav.processEjerlav(updatedEjerlav.link, username, password);
        });
      });
  }).on('error', function(error) {
    throw 'Unable to fetch from ' + feedUrl + ': ' + error;
  });
});