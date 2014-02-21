"use strict";
var ZSchema = require('z-schema');

var zSchemaValidator = new ZSchema({noZeroLengthStrings: true,
  noExtraKeywords: true,
  forceItems: true,
  forceProperties: true,
  sync: true
});

function isSchemaValid(object, schema) {
  var valid = zSchemaValidator.validate(object, schema);
  if(!valid) {
    console.log("invalid json: " + JSON.stringify(object));
    console.log(zSchemaValidator.getLastError());
  }
  return valid;
}

exports.isSchemaValid = isSchemaValid;