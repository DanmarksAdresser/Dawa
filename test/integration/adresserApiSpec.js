"use strict";

var request = require("request");

describe("AdresserApi", function() {
  describe("Opslag på ID", function() {
    it("Should be possible to get an address", function(done) {
      request.get('http://localhost:3002/adresser/0a3f50a3-823b-32b8-e044-0003ba298018', function(error, response, body) {
        expect(response.statusCode).toBe(200);
        var adresse = JSON.parse(body);
        expect(adresse.id).toBe('0a3f50a3-823b-32b8-e044-0003ba298018');
        done();
      });
    });
  });
});

describe('When searching for polygons and zipcodes', function () {

  it('both should be used', function (done) {
    request.get('http://localhost:3002/adresser'+
                '?polygon=[[[12.5,55.59], [12.6,55.59], [12.6,55.595], [12.5,55.595], [12.5,55.59]]]&postnr=2791',
                function(error, response, body){
                  if (response.statusCode != "200"){
                    done(response.statusCode);
                  } else {
                    var adrs = JSON.parse(body);
                    expect(adrs.length).toBe(106);
                    done();
                  }
                });
  });
});

describe('The query-parameter', function () {

  it('vejkode should succeed', function (done) {
    request.get('http://localhost:3002/adresser?vejkode=0689',
                function(error, response, body){
                  var adrs = JSON.parse(body);
                  expect(response.statusCode).toBe(200);
                  expect(adrs.length).toBeGreaterThan(1);
                  done();
                });
  });

  it('vejkode should succeed without leading 0s', function (done) {
    request.get('http://localhost:3002/adresser?vejkode=689',
                function(error, response, body){
                  var adrs = JSON.parse(body);
                  expect(response.statusCode).toBe(200);
                  expect(adrs.length).toBeGreaterThan(1);
                  done();
                });
  });
  it('vejkode should fail', function (done) {
    request.get('http://localhost:3002/adresser?vejkode=A851',
                function(error, response, body){
                  var adrs = JSON.parse(body);
                  expect(response.statusCode).toBe(400);
                  expect(adrs.type).toBe("QueryParameterFormatError");
                  done();
                });
  });
});