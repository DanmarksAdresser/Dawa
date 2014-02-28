"use strict";

var request = require("request");
var apiSpec = require('../../apiSpec');
var apiSpecUtil = require('../../apiSpecUtil');
var csv = require('csv');

describe('CSV udtræk', function() {
  describe('Alle søgninger kan leveres i CSV-format', function() {
    apiSpec.allSpecNames.forEach(function(apiSpecName) {
      var spec = apiSpec[apiSpecName];
      it('søgning i ' + apiSpecName + ' kan leveres i CSV-format', function(done) {
        request.get("http://localhost:3000/"+ spec.model.plural+"?per_side=10&format=csv", function(error, response, body) {
          expect(response.headers['content-type']).toBe("text/csv; charset=UTF-8");
          csv()
            .from.string(body, {columns: true})
            .to.array(function (data) {
              expect(data.length).toBe(10);
              apiSpecUtil.getKeyForSelect(spec).forEach(function(keyColumnName){
                expect(data[0][keyColumnName]).toBeDefined();
                expect(data[0][keyColumnName]).not.toBeNull();
              });
              done();
            });
        });
      });
    });
  });
});