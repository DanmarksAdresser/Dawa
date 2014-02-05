"use strict";

var request = require("request");

describe('Ill-formed query parameters', function () {
  it('should result in QueryParameterFormatError', function (done) {
    request.get('http://localhost:3000/api/pg/adresser?postnr=860',
                function(err, response, body){
                  expect(response.statusCode).toBe(400);
                  var error = JSON.parse(body);
                  expect(error).toEqual(
                    {
                      "type": "QueryParameterFormatError",
                      "title": "One or more query parameters was ill-formed.",
                      "details": [['postnr', 'Value 860 is less than minimum 1000']]
                    });
                  done();
                });
  });
});

describe('Ill-formed UUID', function () {
  it('should result in UUIDFormatError', function (done) {
    request.get('http://localhost:3000/api/pg/adresser/0a3f50c1-deb6-32b8-e04-0003ba298018',
                function(err, response, body){
                  expect(response.statusCode).toBe(400);
                  var error = JSON.parse(body);
                  expect(error).toEqual(
                    {
                      "type": "UUIDFormatError",
                      "title": "The address-UUID was ill-formed.",
                      "details": 'UUID is ill-formed: 0a3f50c1-deb6-32b8-e04-0003ba298018. String does not match pattern: ^([0-9a-fA-F]{8}\\-[0-9a-fA-F]{4}\\-[0-9a-fA-F]{4}\\-[0-9a-fA-F]{4}\\-[0-9a-fA-F]{12})$'
                    });
                    done();
                });
  });
});

describe('When getting single addresses', function () {
  it('an unknown id will fail', function (done) {
    var uuid2 = '0a3f50ae-aaaa-bbbb-cccc-0003ba298019';
    request.get('http://localhost:3000/api/pg/adresser/'+uuid2,
                function(err, response, body){
                  expect(response.statusCode).toBe(404);
                  var error = JSON.parse(body);
                  expect(error).toEqual(
                    {
                      type: "AddressNotFoundError",
                      title: "The given UUID does not match any address.",
                      details: "UUID: 0a3f50ae-aaaa-bbbb-cccc-0003ba298019, match no address"
                    });
                  done();
                });
  }, 300);

});
