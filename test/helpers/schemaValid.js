"use strict";

var ZSchema = require('z-schema');

module.exports = function (chai) {
  var Assertion = chai.Assertion;

  Assertion.addMethod('schemaValid', function (schema) {
    var obj = this._obj;

    var zSchemaValidator = new ZSchema({
      forceItems: true,
      forceProperties: true
    });

    var valid =  zSchemaValidator.validate(obj, schema);
    var errorMessage = "";
    if (!valid) {
      errorMessage = JSON.stringify(zSchemaValidator.getLastErrors());
    }
    this.assert(
      valid,
      "expected #{this} to be valid according to schema #{exp}. Error messages: " + errorMessage,
      "expected #{this} to not be valid according to schema #{exp}",
      obj,
      schema);
  });
};
