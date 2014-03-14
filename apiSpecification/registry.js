"use strict";

var _ = require('underscore');

var registry = [];

exports.add = function(entityName, type, qualifier, object) {
  registry.push({
    entityName: entityName,
    type: type,
    qualifier: qualifier,
    object: object
  });
};

exports.addMultiple = function (entityName, type, objectMap) {
  _.each(objectMap, function (object, qualifier) {
    exports.add(entityName,
      type,
      qualifier,
      object
    );
  });
};

exports.where = function(spec) {
  return _.pluck(_.where(registry, spec), 'object');
};

exports.findWhere = function(spec) {
  var entry = _.findWhere(registry, spec);
  if(entry) {
    return entry.object;
  }
  return undefined;
};