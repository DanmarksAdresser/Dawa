"use strict";

var JSFtp = require("jsftp");
var url = require("url");
var JSZip = require("jszip");

exports.processEjerlav = function(link, username, password) {
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

    console.log("Connected for: " + url.format(linkUrl));

    var chunks = [], dataLen = 0;

    socket.on("data", function(chunk) {
      console.log("Received %d bytes from: %s", chunk.length, url.format(linkUrl));
      chunks.push(chunk);
      dataLen += chunk.length;
    });
    socket.on("error", function(err) {
      throw "Error reading zip contents from " + url.format(linkUrl) + ": " + err;
    });
    socket.on("end", function(hadError) {
      var i,len,pos;
      if (!hadError) {
        var buf = new Buffer(dataLen);
        for (i=0,len=chunks.length,pos=0; i<len; i += 1) {
          chunks[i].copy(buf, pos);
          pos += chunks[i].length;
        }

        var zip = new JSZip(buf);
        console.log("Unzipping %d bytes from: %s", dataLen, url.format(linkUrl));
        var gmlFiles = zip.file(/.*\.gml/);
        if (gmlFiles.length !== 1) {
          throw 'Found ' + gmlFiles.length + " gml files in zip file from " + url.format(linkUrl) + ", expected exactly 1";
        }
        console.log(gmlFiles[0].asText());
      } else {
        console.log("Not unzipping, socket had errors");
      }
    });
    socket.resume();
  });
};

