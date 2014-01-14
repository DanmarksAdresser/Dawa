"use strict";

var express = require('express');
var JSONStream = require('JSONStream');

var pg = require('pg');
var QueryStream = require('pg-query-stream');
var conString = "postgres://pmm@dkadrdevdb.co6lm7u4jeil.eu-west-1.rds.amazonaws.com:5432/dkadr";

var SQL =
  "SELECT * FROM adgangsadresser " +
  "LEFT JOIN enhedsadresser ON (enhedsadresser.adgangsadresseid = adgangsadresser.id) " +
  "LEFT JOIN vejnavne ON (adgangsadresser.kommunekode = vejnavne.kommunekode and adgangsadresser.vejkode = vejnavne.kode) " +
  "LEFT JOIN postnumre ON (adgangsadresser.postnr = postnumre.nr) "+
  "WHERE adgangsadresser.postnr = 8620";

function addressesInZip(sql, cb){
  pg.connect(conString, function(err, client, done) {
    if(err) {
      return console.error('could not connect to postgres', err);
    }
    var stream = client.query(new QueryStream(sql));
    stream.on('end', done);
    stream.on('error', done);
    cb(stream, done);
  });
}

function finalizeOnHttpConnFailures(done, httpStream){
      httpStream.on('error', function(err) {
        console.error("An error happened while sending response to client", new Error(err));
        done();
      });
      httpStream.on('clientError', function(err) {
        console.info("clientError: An error happened while sending response to client", new Error(err));
        done();
      });
      httpStream.on('close', function() {
        console.info("Client closed connection");
        done();
      });
}

exports.setupRoutes = function(db) {
  var app = express();
  app.set('jsonp callback', true);
  app.use(express.methodOverride());
  app.use(express.bodyParser());

  app.get(/^\/adresser(?:\.(\w+))?$/i, function (req, res) {
    addressesInZip(SQL, function(adrStream, done){
      finalizeOnHttpConnFailures(done, res);
      adrStream.pipe(JSONStream.stringify()).pipe(res);
    });
  });
  return app;
};
