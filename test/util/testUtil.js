"use strict";

var async = require('async');
var _ = require('underscore');
var crud = require('../../crud/crud');
var datamodels = require('../../crud/datamodel');

exports.setupFixture = function setupFixture(client, fixture, callback){
  async.eachSeries(_.keys(fixture),
    function(datamodelName, callback) {
      var objects = fixture[datamodelName];
      var datamodel = datamodels[datamodelName];
      async.eachSeries(objects, function(object, callback) {
        crud.create(client, datamodel, object, callback);
      }, callback);
    }, function(err) {
      if(err) {
        throw err;
      }
      callback();
    });
};
