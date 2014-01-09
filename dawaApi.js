"use strict";

var express = require('express');
var postnroperationer = require('./postnummerCrud');


module.exports = function(db) {
  var app = express();
  app.set('jsonp callback', true);
  app.use(express.methodOverride());
  app.use(express.bodyParser());

  app.get('/postnumre/:nr', function(req, res) {
    var nr = req.params.nr;
    postnroperationer.getPostnummer(db, nr, function(err, postnummer) {
      if(err) {
        console.error(err);
        res.status(500);
        res.end();
        return;
      }
      if(!postnummer) {
        res.status(404);
        res.end("Ukendt postnr: " + nr);
        return;
      }
      console.log("sender postnummer: " + JSON.stringify(postnummer));
      res.status(200);
      res.json(postnummer);
      res.end();
    });
  });

  app.put('/postnummerhaendelse/oprettelse', function(req, res) {
    var haendelse = req.body;
    postnroperationer.putPostnummer(db, haendelse.postnummer, function(err) {
      if(err) {
        console.error(err);
        res.status(500);
        res.end();
        return;
      }
      res.status(200);
      res.end();
    });
  });
return app;
};