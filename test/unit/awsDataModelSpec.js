"use strict";
var model = require("../../awsDataModel");
var ZSchema = require("z-schema");
var validator = new ZSchema({noZeroLengthStrings: true,
                             noExtraKeywords: true,
                             forceItems: true,
                             forceProperties: true});

describe("Postnummer schema validation", function () {
  it("should validate basic datum", function (done) {
    validator.validate({nr: '8600', navn: 'Silkeborg', version: 'ver1'}, model.postnummerSchema)
      .then(function(report){
        expect(report.valid).toBe(true);
        done();
      })
      .catch(function(err){
        expect(err).toBe(false);
        done();
      });

  });
  it("should fail on 5 digit zip", function (done) {
    validator.validate({nr: '88600', navn: 'Silkeborg', version: 'ver1'}, model.postnummerSchema)
      .then(function(report){
        expect(report.valid).toBe(false);
        done();
      })
      .catch(function(err){
        expect(err.errors.length).toBe(1);
        done();
      });

  });
});

