"use strict";

var awsDataModel = require('./awsDataModel');

function buildCrud(model) {
  var crud = {};
  crud.get = function(db, key, callback) {
    db.collection(model.plural, function (err, collection) {
      if (err) {
        callback(err);
        return;
      }
      var query = {};
      query[model.key] = key;
      return collection.findOne(query, callback);
    });
  };

  crud.query = function(db, query, callback) {
    db.collection(model.plural, function (err, collection) {
      if (err) {
        callback(err);
        return;
      }
      return collection.find(query, callback);
    });
  };

  crud.put = function(db, object, callback) {
    model.validate(object).then(function() {
      db.collection(model.plural, function(err, collection) {
        if (err) {
          callback(err);
          return;
        }
        var query = {};
        query[model.key] = object[model.key];
        return collection.update(query, object, { upsert: true }, callback);
      });
    }).catch(function(err) {
        callback(err);
      });
  };

  return crud;
}

module.exports = {
  adresse : buildCrud(awsDataModel.adresse),
  postnummer: buildCrud(awsDataModel.postnummer)
};