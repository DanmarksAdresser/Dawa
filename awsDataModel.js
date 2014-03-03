'use strict';

var autocompleteRepresenations = require('./apiSpecification/autocompleteRepresentations');
var jsonRepresenations = require('./apiSpecification/jsonRepresentations');
var namesAndKeys = require('./apiSpecification/namesAndKeys');
var ZSchema = require("z-schema");
var _       = require("underscore");

var zSchemaValidator = new ZSchema({noZeroLengthStrings: true,
  noExtraKeywords: true,
  forceItems: true,
  forceProperties: true});

function makeValidator(schema) {
  return function(object) {
    return zSchemaValidator.validate(object, schema);
  };
}

_.forEach(namesAndKeys, function(nameAndKey, resourceName) {
  exports[resourceName] = {
      name: resourceName,
      plural: nameAndKey.plural,
      schema: jsonRepresenations[resourceName].schema,
      autocompleteSchema: autocompleteRepresenations[resourceName].schema,
      key: nameAndKey.key,
      validate: makeValidator(jsonRepresenations[resourceName].schema)
    };
});