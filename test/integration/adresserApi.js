"use strict";

var request = require("request");
var _       = require("underscore");

describe('When searching for polygons and zipcodes', function () {

  it('both should be used', function (done) {
    request.get('http://localhost:3000/api/pg/adresser'+
                '?polygon=[[[56.191, 9.501], [56.199, 9.501], [56.199, 9.529], [56.191, 9.529], [56.191, 9.501]]]'+
                '&postnr=8600',
                function(error, response, body){
                  if (response.statusCode != "200"){
                    done(response.statusCode);
                  } else {
                    var adrs = JSON.parse(body);
                    // TODO Naar alle enhedsadresser er oprettet vil dette resultere i 152
                    expect(adrs.length).toBe(130);
                    done();
                  }
                });
  }, 15000);
});

describe('The query-parameter', function () {

  it('vejkode should succeed', function (done) {
    request.get('http://localhost:3000/api/pg/adresser?vejkode=0851',
                function(error, response, body){
                  var adrs = JSON.parse(body);
                  expect(response.statusCode).toBe(200);
                  expect(adrs.length).toBeGreaterThan(1);
                  done();
                });
  });

  it('vejkode should succeed without leading 0s', function (done) {
    request.get('http://localhost:3000/api/pg/adresser?vejkode=851',
                function(error, response, body){
                  var adrs = JSON.parse(body);
                  expect(response.statusCode).toBe(200);
                  expect(adrs.length).toBeGreaterThan(1);
                  done();
                });
  });
  it('vejkode should fail', function (done) {
    request.get('http://localhost:3000/api/pg/adresser?vejkode=A851',
                function(error, response, body){
                  var adrs = JSON.parse(body);
                  expect(response.statusCode).toBe(400);
                  expect(adrs.type).toBe("QueryParameterFormatError");
                  done();
                });
  });

  it('param should succeed', function (done) {
    var params = [
      ['id', '0a3f50c1-b854-32b8-e044-0003ba298018'],
      ['vejkode', '0851'],
      ['vejnavn', 'Jeppe Aakjærs Vej'],
      ['husnr', '8'],
      ['etage', 'st'],
      ['dør', '1'],
      ['adgangsadresseid', '0a3f5095-45ef-32b8-e044-0003ba298018'],
      ['kommunekode', '0740'],
      ['ejerlavkode', '00810151'],
      ['matrikel', '12ek'],
      ['q', 'Jeppe Aakjærs Vej'],
      // polygon and postnr is // Tested elsewhere!
      //TODO supplerendebynavn. No data yet!
    ];

    _.each(params, queryParamTest);
    done();

  });
});

function queryParamTest(param){
  return request.get('http://localhost:3000/api/pg/adresser?postnr=8600&'+param[0]+'='+encodeURIComponent(param[1]),
                     function(error, response, body){
                       var adrs = JSON.parse(body);
                       expect(response.statusCode).toBe(200);
                       expect(adrs.length).toBeGreaterThan(0);
                     });
}
