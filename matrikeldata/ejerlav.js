"use strict";

var JSFtp = require("jsftp");
var url = require("url");
var JSZip = require("jszip");
var xml2js = require('xml2js');
var Q = require('q');
var _ = require('underscore');
var tema = require('../temaer/tema');
var logger = require('../logger').forCategory('ejerlav');
var sqlCommon = require('../psql/common');


function parseInteger(str) {
  return parseInt(str, 10);
}

exports.parseEjerlav = function(body) {
  console.log("parse START")
  return Q.nfcall(xml2js.parseString, body, {
    tagNameProcessors: [xml2js.processors.stripPrefix],
    trim: true
  }).then(function(result) {
    console.log("parse END")
    if (!result.FeatureCollection) {
      return Q.reject(new Error('Unexpected contents in ejerlav file: ' + JSON.stringify(result)));
    }
    var mapping = {
      name: 'jordstykke',
      geometry: 'surfaceProperty',
      wfsName: 'Jordstykke',
      fields: {
        ejerlavkode: {
          name: 'landsejerlavskode',
          parseFn: parseInteger
        },
        matrikelnr: {
          name: 'matrikelnummer',
          parseFn: _.identity
        },
        featureID: {
          name: 'featureID',
          parseFn: parseInteger
        }
      }
    };

    var temaDef = tema.findTema('jordstykke');

    var features = result.FeatureCollection.featureMember;

    return _.chain(features)
      .filter(function (feature) {
        // the ejerlav GML might as well as Jordstykke objects contain Centroide objects which we do not want
        return feature[mapping.wfsName];
      })
      .map(function (feature) {
        return tema.wfsFeatureToTema(feature, mapping);
      })
      .groupBy(function (fragment) {
        return tema.stringKey(fragment, temaDef);
      })
      .map(function (fragments) {
        return {
          tema: temaDef.singular,
          fields: fragments[0].fields,
          polygons: _.pluck(fragments, 'polygon')
        };
      })
      .value();
  });
}

exports.storeEjerlav = function(ejerlavkode, jordstykker, client, options) {
  var temaDef = tema.findTema('jordstykke');
  return tema.putTemaer(temaDef, jordstykker, client, options.init, {ejerlavkode: ejerlavkode}, false);
};

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
          exports.parseEjerlav(gmlFiles[0].asText(), function(err, jordstykker) {
            if(err) {
              return callback(err);
            }
            sqlCommon.withTransaction(callback, {
              connString: options.pgConnectionUrl,
              pooled: false,
              mode: 'READ_WRITE'
            }, function(client, callback) {
              exports.storeEjerlav(jordstykker, client, options, callback);
            });
          });
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
