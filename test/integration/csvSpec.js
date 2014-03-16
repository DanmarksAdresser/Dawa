"use strict";

var request = require("request");
var csv = require('csv');
var registry = require('../../apiSpecification/registry');
require('../../apiSpecification/allSpecs');

describe('CSV udtræk', function() {
  describe('Alle søgninger kan leveres i CSV-format', function() {
    var resources = registry.where({
      type: 'resource',
      qualifier: 'query'
    });
    resources.forEach(function(resource) {
      it('søgning i på' + resource.path + ' kan leveres i CSV-format', function(done) {
        request.get("http://localhost:3000"+ resource.path +"?per_side=1&format=csv", function(error, response, body) {
          expect(response.headers['content-type']).toBe("text/csv; charset=UTF-8");
          csv()
            .from.string(body, {columns: true})
            .to.array(function (data) {
              expect(data.length).toBe(1);
              done();
            });
        });
      });
    });
  });
});