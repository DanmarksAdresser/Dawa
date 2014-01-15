"use strict";

var express = require('express');
var JSONStream = require('JSONStream');

var pg = require('pg');
var QueryStream = require('pg-query-stream');
var connString = "postgres://pmm@dkadrdevdb.co6lm7u4jeil.eu-west-1.rds.amazonaws.com:5432/dkadr";

var SQL ="\n"+
  "  SELECT * FROM adgangsadresser\n"+
  "  LEFT JOIN enhedsadresser ON (enhedsadresser.adgangsadresseid = adgangsadresser.id)\n" +
  "  LEFT JOIN vejnavne ON (adgangsadresser.kommunekode = vejnavne.kommunekode\n"+
  "            AND adgangsadresser.vejkode = vejnavne.kode)\n" +
  "  LEFT JOIN postnumre ON (adgangsadresser.postnr = postnumre.nr)\n";

function addressesInZip(sql, cb){
  pg.connect(connString, function(err, client, done) {
    if(err) {
      return console.error('could not connect to postgres', err);
    }
    //    console.log("\nAddress SQL: "+sql);
    var stream = client.query(new QueryStream(sql, [], {batchSize: 10000}));
    stream.on('end', done);
    stream.on('error', done);
    cb(stream, done);
  });
}

function onHttpStreamFailures(httpStream, done){
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

  app.get(/^\/adresser.json(?:(\w+))?$/i, function (req, res) {
    var where = "";
    if (req.query.postnr) {
      where = "  WHERE adgangsadresser.postnr = " + req.query.postnr;
    }
    addressesInZip(SQL+where, function(adrStream, done){
      onHttpStreamFailures(res, function() { done(true); });
      adrStream.pipe(JSONStream.stringify('[', ',\n', ']\n')).pipe(res);
    });
  });
  return app;
};
