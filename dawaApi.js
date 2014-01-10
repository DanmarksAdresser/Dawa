"use strict";

var express = require('express');
var awsDataModel = require('./awsDataModel');
var crud = require('./crud');
var JSONStream = require('JSONStream');

function handleInternalError(err, res) {
  console.error(err);
  res.status(500);
  res.end();
}

module.exports = function(db) {
  function publishModel(app, model, crud) {
    app.get('/' + model.plural, function(req, res) {
      crud.query(db, {}, function(err, cursor) {
        if(err) {
          return handleInternalError(err, res);
        }
        res.status(200);
        res.charset='utf-8';
        res.contentType('application/json');
        var cursorStream = cursor.stream({transform: function(object) {
          delete object._id;
          return object;
        }});
        cursorStream.pipe(JSONStream.stringify()).pipe(res);
        res.on('error', function(err) {
          console.error("res: An error happened while sending response to client", new Error(err));
          cursor.close();
        });
        res.on('clientError', function(err) {
          console.info("clientError: An error happened while sending response to client", new Error(err));
          cursor.close();
        });
        res.on('close', function() {
          console.info("Client closed connection");
          cursor.close();
        });
      });
    });
    app.get('/' + model.plural + '/:key', function(req, res) {
      var key = req.params.key;
      crud.get(db, key, function(err, object) {
        if(err) {
          return handleInternalError(err, res);
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
          return handleInternalError(err, res);
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