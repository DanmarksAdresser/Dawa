"use strict";

var model = require("../../awsDataModel");
var ZSchema = require("z-schema");
var validator = new ZSchema({noZeroLengthStrings: true,
                             noExtraKeywords: true,
                             forceItems: true,
                             forceProperties: true});

describe("Postnummer schema validation", function () {
  it("should validate basic datum", function (done) {
    validator.validate({nr: '8600', navn: 'Silkeborg', version: 'ver1'}, model.postnummer.schema)
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
    validator.validate({nr: '88600', navn: 'Silkeborg', version: 'ver1'}, model.postnummer.schema)
      .then(function(report){
        expect(report.valid).toBe(false);
        done();
      })
      .catch(function(err){
        expect(err.errors[0].code).toMatch('PATTERN');
        done();
      });

  });

  it("should fail on extra properties", function (done) {
    validator.validate({nr: '8600', navn: 'Silkeborg', version: 'ver1', foo: 42}, model.postnummer.schema)
      .then(function(report){
        expect(report.valid).toBe(false);
        done();
      })
      .catch(function(err){
        expect(err.errors[0].code).toMatch('OBJECT_ADDITIONAL_PROPERTIES');
        done();
      });

  });
});

