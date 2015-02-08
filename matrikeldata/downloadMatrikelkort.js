"use strict";

var JSFtp = require("jsftp");
var path = require('path');
var fs = require('fs');
var url = require("url");
var Q = require('q');
var FeedParser = require('feedparser');
var http = require('http');
var cliParameterParsing = require('../bbr/common/cliParameterParsing');
var moment = require('moment');
var _ = require('underscore');
var async = require('async');
var logger = require('../logger').forCategory('fetchFeed');

var feedMeta;
var updatedEjerlav = [];

var optionSpec = {
  targetDir: [false, 'Directory to store the files', 'string', '.'],
  feedUrl: [false, 'URL til webservice hvor DAGI temaerne hentes fra', 'string', 'http://kortforsyningen.kms.dk/service?servicename=dagi_gml2'],
  matrikelUsername: [false, 'Brugernavn til webservicen hvor matrikelfeedet hentes fra', 'string', 'dawa'],
  matrikelPassword: [false, 'Password til webservicen hvor matrikelfeedet hentes fra', 'string']
};

function downloadEjerlav(ftp, targetDir, pathname) {
  console.log("Downloading: " + pathname);

  return Q.Promise(function(resolve, reject) {
    ftp.get(pathname, function(err, socket) {
      if (err) {
        return reject("Unable to fetch " + url.format(pathname) + ": " + err);
      }
      var filename = pathname.substring(pathname.lastIndexOf('/') +1);
      var targetPath = path.join(targetDir, filename);
      console.log("writing to " + targetPath);
      var writer = fs.createWriteStream(targetPath);
      socket.on('end', function() {
        console.log('DOWNLOAD FILE COMPLETED');
        socket.destroy();
        resolve();
      });
      socket.pipe(writer);

      socket.resume();
    });
  });
}

cliParameterParsing.main(optionSpec, _.keys(optionSpec), function (args, options) {

  var feedUrl = options.dagiUrl || 'http://download.kortforsyningen.dk/sites/default/files/feeds/MATRIKELKORT_GML.xml';
  var username = options.matrikelUsername || 'dawa';
  var password = options.matrikelPassword;

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
          updatedEjerlav.push({
            title: item.title,
            link: item.link,
            publicationDate: itemPubdate
          });
          logger.info("Modified ejerlav %d added" + JSON.stringify(updatedEjerlav[updatedEjerlav.length-1]), updatedEjerlav.length);
        }
      })
      .on('end', function() {
        logger.info("Fandt " + updatedEjerlav.length);
        if(updatedEjerlav.length === 0) {
          return;
        }
        var linkUrl = url.parse(updatedEjerlav[0].link);
        var ftp = new JSFtp({
          host: linkUrl.hostname,
          port: linkUrl.port || 21,
          user: username,
          pass: password,
          debugMode: true
        });

        async.eachSeries(updatedEjerlav, function(anUpdatedEjerlav, asyncCallback) {
          downloadEjerlav(ftp, options.targetDir, url.parse(anUpdatedEjerlav.link).pathname).nodeify(asyncCallback);
        }, function (err) {
          ftp.destroy();
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