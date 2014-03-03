"use strict";

var definitions = require('./commonSchemaDefinitions');
var schemaObject = require('./schemaUtil').schemaObject;
/*
 * Same as schemaObject, but includes the list of common definitions
 */
exports.globalSchemaObject = function(def) {
  var result = schemaObject(def);
  if(def.definitions) {
    result.definitions = def.definitions;
  }
  else {
    result.definitions = definitions;
  }
  return result;
};

