"use strict";

var express = require('express');
var awsDataModel = require('./awsDataModel');
var crud = require('./crud');

module.exports = function(db) {
  function publishModel(app, model, crud) {
    app.get('/' + model.plural + '/:key', function(req, res) {
      var key = req.params.key;
      crud.get(db, key, function(err, object) {
        if(err) {
          console.error(err);
          res.status(500);
          res.end();
          return;
        }
        if(!object) {
          res.status(404);
          res.end("Ukendt " + model.name + ": " + key);
          return;
        }
        res.status(200);
        res.json(object);
        res.end();
      });

    });
  }

  function publishBbrCallbacks(app, model, crud) {
    app.put('/' + model.name + 'haendelse/oprettelse', function(req, res) {
      var haendelse = req.body;
      crud.put(db, haendelse[model.name], function(err) {
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
  }

  var app = express();
  app.set('jsonp callback', true);
  app.use(express.methodOverride());
  app.use(express.bodyParser());

  publishModel(app, awsDataModel.postnummer, crud.postnummer);
  publishModel(app, awsDataModel.adresse, crud.adresse);

  publishBbrCallbacks(app, awsDataModel.postnummer, crud.postnummer);
  publishBbrCallbacks(app, awsDataModel.adresse, crud.adresse);
return app;
};