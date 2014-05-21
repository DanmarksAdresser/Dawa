"use strict";

var request = require("request");
var _ = require('underscore');
//var _       = require("underscore");

var kommuner = [ { href : 'http://localhost:3000/kommuner/253', kode : "0253", navn : 'Greve' },
                 { href : 'http://localhost:3000/kommuner/269', kode : "0269", navn : 'Solrød' } ];

describe("PostnumreApi", function() {
  it("It is possible to get a single postnummer", function(done) {
    request.get({url: "http://localhost:3000/postnumre/2690", json: true}, function(error, response, result) {
      expect(result.nr).toBe("2690");
      expect(result.navn).toBe("Karlslunde");
      expect(result.kommuner).toEqual(kommuner);
      done();
    });
  });
  it("It is possible to autocomplete a postnummer", function(done) {
    request.get({url: "http://localhost:3000/postnumre/autocomplete?q=Karls", json: true}, function(error, response, result) {
      var suggestion = result[0];
      expect(suggestion.tekst).toBe('2690 Karlslunde');
      expect(suggestion.postnummer.nr).toBe("2690");
      done();
    });
  });

  it('It is possible to search for postnumre', function(done) {
    request.get({url: "http://localhost:3000/postnumre?q=karlslunde", json: true}, function(error, response, result) {
      var postnummer = result[0];
      expect(postnummer.nr).toBe("2690");
      expect(postnummer.navn).toBe('Karlslunde');
      expect(postnummer.kommuner).toEqual(kommuner);
      done();
    });
  });

  it('It is possible to search for postnumre by name', function(done) {
    request.get({url: "http://localhost:3000/postnumre?navn=Karlslunde", json: true}, function(error, response, result) {
      var postnummer = result[0];
      expect(postnummer.nr).toBe("2690");
      expect(postnummer.navn).toBe('Karlslunde');
      expect(postnummer.kommuner).toEqual(kommuner);
      done();
    });
  });
  it('It is possible to search for postnumre by kommunekode', function(done) {
    request.get({url: "http://localhost:3000/postnumre?kommune=253", json: true}, function(error, response, result) {
      var postnummer = _.findWhere(result, {nr: "2690"});
      expect(postnummer.nr).toBeDefined();
      expect(postnummer.navn).toBe('Karlslunde');
      expect(postnummer.kommuner).toEqual(kommuner);
      done();
    });
  });

  it('Jeg kan hente stormodtagerpostnumre', function(done) {
    request.get({url: "http://localhost:3000/postnumre?stormodtagere=true", json: true}, function(error, response, result) {
      var fandtStormodtager = _.some(result, function(postnummer) {
        return _.isArray(postnummer.stormodtageradresser) && postnummer.stormodtageradresser.length > 0;
      });
      expect(fandtStormodtager).toBeTruthy();
      done();
    });
  });
  it('Jeg kan hente et enkelt stormodtagerpostnummer', function(done) {
    request.get({url: "http://localhost:3000/postnumre/1786", json: true}, function(error, response, result) {
      expect(result.nr).toBe('1786');
      done();
    });
  });

});
