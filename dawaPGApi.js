"use strict";

var express     = require('express');
var JSONStream  = require('JSONStream');
var _           = require('underscore');
var pg          = require('pg');
var QueryStream = require('pg-query-stream');

var connString = "postgres://pmm@dkadrdevdb.co6lm7u4jeil.eu-west-1.rds.amazonaws.com:5432/dkadr";

var SQL ="\n"+
  "  SELECT * FROM adgangsadresser as A\n"+
  "  LEFT JOIN enhedsadresser as E ON (E.adgangsadresseid = A.id)\n" +
  "  LEFT JOIN vejnavne as V ON (A.kommunekode = V.kommunekode\n"+
  "            AND A.vejkode = V.kode)\n" +
  "  LEFT JOIN postnumre as P ON (A.postnr = P.nr)\n";

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
    var whereClauses = [];
    if (req.query.postnr) {
      whereClauses.push("A.postnr = " + parseInt(req.query.postnr)+"\n");
    }
    if (req.query.polygon) {
      // mapping GeoJson to WKT (Well-Known Text)
      var p = JSON.parse(req.query.polygon);
      var mapPoint   = function(point) { return ""+point[0]+" "+point[1]; };
      var mapPoints  = function(points) { return "("+_.map(points, mapPoint).join(", ")+")"; };
      var mapPolygon = function(poly) { return "POLYGON("+_.map(poly, mapPoints).join(" ")+")"; };
      var poly = mapPolygon(p);
      whereClauses.push(
        "ST_Contains(ST_GeomFromText('"+poly+"', 4326)::geometry, A.geom)\n");
    }
    var where = "  WHERE "+whereClauses.join("        AND ");
    console.log(SQL+where);
    addressesInZip(SQL+where, function(adrStream, done){
      onHttpStreamFailures(res, function() { done(true); });
      //TODO better error handling!!!!!
      adrStream.on('error', function(err) { console.log(err); res.status(500); res.end(); });
      adrStream.pipe(JSONStream.stringify('[', ',\n', ']\n')).pipe(res);
    });
  });
  return app;
};

// For manuel testing
// Area around my home (PMM): POLYGON((56.129 9.60, 56.139 9.60, 56.139 9.65, 56.129 9.65, 56.129 9.60))
// About 1200 addresses in the polygon
