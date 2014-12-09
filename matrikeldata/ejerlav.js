"use strict";

var http = require("http");
var url = require("url");
var JSZip = require("jszip");

exports.processEjerlav = function(link, username, password) {
  var linkUrl = url.parse(link.replace(/ftp:\/\//g, 'ftp://' + username + ':' + password + "@"));
  console.log("Not downloading yet: " + JSON.stringify(linkUrl));
  return;

  var req = http.get(linkUrl, function(res) {
    if (res.statusCode !== 200) {
      throw 'Unable to fetch ' + url + ", HTTP status: " + res.statusCode;
    }
    var data = [], dataLen = 0;

    // don't set the encoding, it will break everything !
    // or, if you must, set it to null. In that case the chunk will be a string.

    res.on("data", function (chunk) {
      data.push(chunk);
      dataLen += chunk.length;
    });

    res.on("end", function () {
      var i,len,pos;
      var buf = new Buffer(dataLen);
      for (i=0,len=data.length,pos=0; i<len; i++) {
        data[i].copy(buf, pos);
        pos += data[i].length;
      }

      // here we go !
      var zip = new JSZip(buf);
      console.log(zip.file("content.txt").asText());
    });
  });

  req.on("error", function(err) {
    throw "Unable to fetch " + url + ": " + err;
  });
}

