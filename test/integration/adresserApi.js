"use strict";

var request = require("request");

describe('Zipcode format errors', function () {
  it('should result in failure', function (done) {
    request.get('http://localhost:3000/api/pg/adresser?postnr=860',
                function(error, response, body){
                  expect(response.statusCode).toBe(500);
                  done();
                });
  });
  it('should result in failure', function (done) {
    request.get('http://localhost:3000/api/pg/adresser?postnr=86000',
                function(error, response, body){
                  expect(response.statusCode).toBe(500);
                  done();
                });
  });
  it('should result in failure', function (done) {
    request.get('http://localhost:3000/api/pg/adresser?postnr=860A',
                function(error, response, body){
                  expect(response.statusCode).toBe(500);
                  done();
                });
  });
});

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
                    expect(adrs.length).toBe(152);
                    done();
                  }
                });
  }, 15000);
});

describe('When getting single addresses', function () {
  it('a correct id will work', function (done) {
    var uuid = '0a3f50c1-deb6-32b8-e044-0003ba298018';
    request.get('http://localhost:3000/api/pg/adresser/'+uuid,
                function(error, response, body){
                  var adr = JSON.parse(body);
                  expect(adr.error).toBeUndefined();
                  expect(response.statusCode).toBe(200);
                  expect(adr.id).toBe(uuid);
                  done();
                });
  });

  it('an incorrect id will fail', function (done) {
    var uuid = '0a3f50c1-deb-32b-e04-0003ba298018';
    request.get('http://localhost:3000/api/pg/adresser/'+uuid,
                function(error, response, body){
                  var adr = JSON.parse(body);
                  expect(adr.error).toBeDefined();
                  expect(response.statusCode).toBe(500);
                  done();
                });
  });

  it('an unknown id will fail', function (done) {
    var uuid2 = '0a3f50ae-da7f-32b8-e044-0003ba298019';
    request.get('http://localhost:3000/api/pg/adresser/'+uuid2,
                function(error, response, body){
                  expect(response.statusCode).toBe(500);
                  expect(JSON.parse(body).error).toMatch('unknown id');
                  done();
                });
  }, 300);

});
