"use strict";

var expect = require('chai').expect;
var request = require("request-promise");

describe('Ill-formed query parameters', function () {
  it('should result in QueryParameterFormatError', function (done) {
    request.get('http://localhost:3002/adresser?postnr=12345',
                function(err, response, body){
                  expect(response.statusCode).to.equal(400);
                  var error = JSON.parse(body);
                  expect(error).to.deep.equal(
                    {
                      "type": "QueryParameterFormatError",
                      "title": "One or more query parameters was ill-formed.",
                      "details": [['postnr', 'Value 12345 is greater than maximum 9999']]
                    });
                  done();
                });
  });
});

describe('Ill-formed UUID', function () {
  it('should result in ResourcePathFormatError', function (done) {
    request.get('http://localhost:3002/adresser/0a3f50c1-deb6-32b8-e04-0003ba298018',
                function(err, response, body){
                  expect(response.statusCode).to.equal(404);
                  var error = JSON.parse(body);
                  expect(error).to.deep.equal(
                    {
                      "type": "ResourcePathFormatError",
                      "title": "The URI path was ill-formed.",
                      "details": [ [ 'id', 'String does not match pattern ^([0-9a-fA-F]{8}\\-[0-9a-fA-F]{4}\\-[0-9a-fA-F]{4}\\-[0-9a-fA-F]{4}\\-[0-9a-fA-F]{12})$: 0a3f50c1-deb6-32b8-e04-0003ba298018' ] ]
                    });
                    done();
                });
  });
});

describe('When getting single addresses', function () {
  it('an unknown id will fail', function (done) {
    var uuid2 = '0a3f50ae-aaaa-bbbb-cccc-0003ba298019';
    request.get('http://localhost:3002/adresser/'+uuid2,
                function(err, response, body){
                  expect(response.statusCode).to.equal(404);
                  var error = JSON.parse(body);
                  expect(error).to.deep.equal(
                    {
                      type: "ResourceNotFoundError",
                      title: "The resource was not found",
                      details: {
                        id : '0a3f50ae-aaaa-bbbb-cccc-0003ba298019'
                      }
                    });
                  done();
                });
  }, 300);

});
