"use strict";

var request = require("request");
var _       = require("underscore");

describe("AdresserApi", function() {
  describe("Opslag på ID", function() {
    it("Should be possible to get an address", function(done) {
      request.get('http://localhost:3000/adresser/0a3f50a3-823b-32b8-e044-0003ba298018', function(error, response, body) {
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
    request.get('http://localhost:3000/adresser'+
                '?polygon=[[[55.3, 9.4], [55.6, 12.7], [55.601, 12.7], [55.301, 9.4], [55.3, 9.4]]]'+
                '&postnr=2690',
                function(error, response, body){
                  if (response.statusCode != "200"){
                    done(response.statusCode);
                  } else {
                    var adrs = JSON.parse(body);
                    // TODO Naar alle enhedsadresser er oprettet vil dette resultere i 152
                    expect(adrs.length).toBe(177);
                    done();
                  }
                });
  });
});

describe('The query-parameter', function () {

  it('vejkode should succeed', function (done) {
    request.get('http://localhost:3000/adresser?vejkode=0801',
                function(error, response, body){
                  var adrs = JSON.parse(body);
                  expect(response.statusCode).toBe(200);
                  expect(adrs.length).toBeGreaterThan(1);
                  done();
                });
  });

  it('vejkode should succeed without leading 0s', function (done) {
    request.get('http://localhost:3000/adresser?vejkode=801',
                function(error, response, body){
                  var adrs = JSON.parse(body);
                  expect(response.statusCode).toBe(200);
                  expect(adrs.length).toBeGreaterThan(1);
                  done();
                });
  });
  it('vejkode should fail', function (done) {
    request.get('http://localhost:3000/adresser?vejkode=A851',
                function(error, response, body){
                  var adrs = JSON.parse(body);
                  expect(response.statusCode).toBe(400);
                  expect(adrs.type).toBe("QueryParameterFormatError");
                  done();
                });
  });
});

describe('All paremetrs should succeed. ', function () {

  var params = [
    ['id', '0a3f50aa-e376-32b8-e044-0003ba298018'],
    ['vejkode', '0801'],
    ['vejnavn', 'Solvej'],
    ['husnr', '8'],
    ['etage', 'st'],
    ['dør', 'th'],
    ['adgangsadresseid', '0a3f5081-166b-32b8-e044-0003ba298018'],
    ['kommunekode', '253'],
    ['ejerlavkode', '40453'],
    ['matrikel', '2cv'],
    ['q', 'Engparken'],
    // polygon and postnr is // Tested elsewhere!
    //TODO supplerendebynavn. No data yet!
  ];

  _.each(params, queryParamTest);
});

function queryParamTest(param){
  it(param+' should succeed', function(done){
    request.get('http://localhost:3000/adresser?postnr=2690&'+param[0]+'='+encodeURIComponent(param[1]),
                function(error, response, body){
                  var adrs = JSON.parse(body);
                  expect(response.statusCode).toBe(200);
                  expect(adrs.length).toBeGreaterThan(0);
                  done();
                });
  });
}
