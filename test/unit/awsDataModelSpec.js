"use strict";
var model = require("../../awsDataModel");
var ZSchema = require("z-schema");
var validator = new ZSchema({noZeroLengthStrings: true,
                             noExtraKeywords: true,
                             forceItems: true,
                             forceProperties: true});

describe("Postnummer schema validation", function () {
  it("should validate basic datum", function () {
    var result;
    validator.validate({nr: '8600', navn: 'Silkeborg', version: 'ver1'}, model.postnummerSchema)
    /*jshint unused: vars */
      .then(function(report){
        result = report;
      })
      .catch(function(err){
        console.error(err);
        result = err;
      });

    waitsFor(function() { return !(result === undefined); }, "schema validation to succeed", 100);

    runs(function(){
      expect(result.valid).toBe(true);
    });
  });
});

