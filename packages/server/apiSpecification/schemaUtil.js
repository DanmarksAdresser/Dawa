"use strict";

/*
 * Utility functions related to JSON Schema
 */

var _ = require('underscore');
var ZSchema = require("z-schema");


exports.nullableType = function(type) {
  return [type, 'null'];
};

exports.nullable = function(schemaType) {
  var result = _.clone(schemaType);
  if(result.$ref && result.$ref.startsWith('#/definitions/') && !result.$ref.startsWith('#/definitions/Nullable')) {
    result.$ref = result.$ref.replace('#/definitions/', '#/definitions/Nullable');
  }
  else if(result.enum) {
    result.enum = [...result.enum, null];
  }
  else {
    result.type = exports.nullableType(schemaType.type);
  }
  return result;
};

/**
 * Creates a JSON schema object with all fieldMap as required,
 * and the specified docOrder, allowing no additional properties.
 */
exports.schemaObject = function(def) {
  var fieldNames = _.keys(def.properties).sort();
  var documentedNames = _.clone(def.docOrder).sort();
  if(!_.isEqual(fieldNames, documentedNames)) {
    throw new Error("docOrder and list of fieldMap did not correspond. fieldNames: " + JSON.stringify(fieldNames) + " documentedNames " + JSON.stringify(documentedNames));
  }
  var result = {
    type : def.nullable ? exports.nullableType('object') : 'object',
    properties: def.properties,
    required: fieldNames,
    additionalProperties: false,
    docOrder: def.docOrder
  };
  if(def.title) {
    result.title = def.title;
  }
  if(def.description) {
    result.description = def.description;
  }
  return result;
};


exports.compileSchema = function(schema) {
  var validator = new ZSchema();
  if(!validator.validateSchema(schema)) {
    /*eslint no-console:0 */
    console.log(JSON.stringify(schema, null, 2));
    throw new Error("Invalid schema: " + JSON.stringify(validator.getLastErrors()));
  }
  return schema;
};
