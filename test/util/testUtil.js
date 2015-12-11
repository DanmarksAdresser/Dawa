"use strict";

var q = require('q');

var crud = require('../../crud/crud');
var datamodels = require('../../crud/datamodel');

exports.setupFixture = function setupFixture(client, fixture){
  return q.async(function*() {
    for(let datamodelName of Object.keys(fixture)) {
      var datamodel = datamodels[datamodelName];
      var objects = fixture[datamodelName];
      for(let object of objects) {
        yield crud.create(client, datamodel, object);
      }
    }
  })();
};
