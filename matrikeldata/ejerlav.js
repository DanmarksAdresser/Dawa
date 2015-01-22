"use strict";

var JSFtp = require("jsftp");
var url = require("url");
var JSZip = require("jszip");
var xml2js = require('xml2js');
var _ = require('underscore');
var tema = require('../temaer/tema');
var logger = require('../logger').forCategory('ejerlav');

function storeEjerlav(body, options, callback) {
  xml2js.parseString(body, {
    tagNameProcessors: [xml2js.processors.stripPrefix],
    trim: true
  }, function (err, result) {
    if (err) {
      return callback(err);
    }

    if (!result.FeatureCollection) {
      return callback(new Error('Unexpected contents in ejerlav file: ' + JSON.stringify(result)));
    }

    var mapping = {
      name: 'jordstykke',
      geometry: 'surfaceProperty',
      wfsName: 'Jordstykke',
      fields: {}
    };
    var temaDef = tema.findTema('jordstykke');

    var features = result.FeatureCollection.featureMember;

    var jordstykker = _.chain(features)
      .filter(function (feature) {
        // the ejerlav GML might as well as Jordstykke objects contain Centroide objects which we do not want
        return feature[mapping.wfsName];
      })
      .map(function (feature) {
        return tema.wfsFeatureToTema(feature, mapping);
      })
      .groupBy(function(fragment) {
        return fragment.fields[temaDef.key];
      })
      .map(function(fragments) {
        return  {
          tema: temaDef.singular,
          fields: fragments[0].fields,
          polygons: _.pluck(fragments, 'polygon')
        };
      })
    .value();

    tema.putTemaer(temaDef, jordstykker, options.pgConnectionUrl, options.init, callback, function (err) {
      if(err) {
        logger.error('Indlæsning af ejerlav fejlet', { error: err});
      }
      else {
        logger.debug('Indlæsning af ejerlav afsluttet', { ejerlavCount: jordstykker.length });
      }
      callback(err);
    });
  });
}

exports.processEjerlav = function(link, username, password, options, callback) {
  try {
    var linkUrl = url.parse(link);
    console.log("Downloading: " + url.format(linkUrl));

    var ftp = new JSFtp({
      host: linkUrl.hostname,
      port: linkUrl.port || 21,
      user: username,
      pass: password,
      debugMode: true
    });

    ftp.get(linkUrl.pathname, function(err, socket) {
      if (err) {
        throw "Unable to fetch " + url.format(linkUrl) + ": " + err;
      }

      var chunks = [], dataLen = 0;

      socket.on("data", function(chunk) {
        logger.debug("Received %d bytes from: %s", chunk.length, url.format(linkUrl));
        chunks.push(chunk);
        dataLen += chunk.length;
      });
      socket.on("error", function(err) {
        callback("Error reading zip contents from " + url.format(linkUrl) + ": " + err);
      });
      socket.on("end", function(hadError) {
        var i, len, pos;
        if (!hadError) {
          var buf = new Buffer(dataLen);
          for (i = 0, len = chunks.length, pos = 0; i < len; i += 1) {
            chunks[i].copy(buf, pos);
            pos += chunks[i].length;
          }

          var zip = new JSZip(buf);
          console.log("Unzipping %d bytes from: %s", dataLen, url.format(linkUrl));
          var gmlFiles = zip.file(/.*\.gml/);
          if (gmlFiles.length !== 1) {
            throw 'Found ' + gmlFiles.length + " gml files in zip file from " + url.format(linkUrl) + ", expected exactly 1";
          }
          storeEjerlav(gmlFiles[0].asText(), options, callback);
        } else {
          callback("Not unzipping, socket had errors");
        }
      });
      socket.resume();
    });
  } catch (err) {
    console.log("caught", err);
    callback(err.message);
  }
};
