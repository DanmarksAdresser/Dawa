"use strict";
var ZSchema = require('z-schema');

var zSchemaValidator = new ZSchema({
  forceItems: true,
  forceProperties: true
});

function isSchemaValid(object, schema) {
  var valid = zSchemaValidator.validate(object, schema);
  if(!valid) {
    console.log("invalid json: " + JSON.stringify(object));
    console.log(JSON.stringify(zSchemaValidator.getLastErrors()));
  }
  return valid;
}

exports.isSchemaValid = isSchemaValid;