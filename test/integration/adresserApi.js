"use strict";

var request = require("request");

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
