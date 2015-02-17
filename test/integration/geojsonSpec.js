"use strict";

var expect = require('chai').expect;
var request = require("request");
var _       = require("underscore");

describe('GeoJSON format', function() {
  it('Kan hente adresser i GeoJSON format', function(done) {
    request.get('http://localhost:3002/adresser?format=geojson&per_side=10', function(error, response, body) {
      expect(response.statusCode).to.equal(200);
      var featureCollection = JSON.parse(body);
      expect(featureCollection.type).to.equal('FeatureCollection');
      expect(featureCollection.crs).to.deep.equal({
        "type": "name",
        "properties": {
          "name": "EPSG:4326"
        }
      });
      expect(featureCollection.features).to.exist;
      expect(_.isArray(featureCollection.features)).to.equal(true);
      expect(featureCollection.features.length).to.equal(10);
      expect(featureCollection.features[0].properties.id).to.exist;
      done();
    });
  });
  it('Kan lave opslag på adresse i GeoJSON format', function(done) {
    request.get('http://localhost:3002/adresser/0a3f50a3-823b-32b8-e044-0003ba298018?format=geojson', function(error, response, body) {
      expect(response.statusCode).to.equal(200);
      var feature = JSON.parse(body);
      expect(feature.type).to.equal('Feature');
      expect(feature.crs).to.deep.equal({
        "type": "name",
        "properties": {
          "name": "EPSG:4326"
        }
      });
      expect(feature.properties).to.exist;
      expect(feature.properties.id).to.equal("0a3f50a3-823b-32b8-e044-0003ba298018");
      done();
    });
  });
  it('medtager kvhx i adresse output', function(done) {
    request.get('http://localhost:3002/adresser/0a3f50a3-823b-32b8-e044-0003ba298018?format=geojson', function(error, response, body) {
      expect(response.statusCode).toBe(200);
      var feature = JSON.parse(body);
      expect(feature.properties.kvhx).toEqual("01551010__37_______");
      done();
    });
  });
  it('medtager kvh i adresse output', function(done) {
    request.get('http://localhost:3002/adgangsadresser/0a3f507b-b8e2-32b8-e044-0003ba298018?format=geojson', function(error, response, body) {
      expect(response.statusCode).toBe(200);
      var feature = JSON.parse(body);
      expect(feature.properties.kvh).toEqual("01550966___6");
      done();
    });
  });

  it('Kan hente postnumre i GeoJSON format', function(done) {
    request.get('http://localhost:3002/postnumre?format=geojson', function(error, response, body) {
        expect(response.statusCode).to.equal(200);
        var featureCollection = JSON.parse(body);
        expect(featureCollection.type).to.equal('FeatureCollection');
        expect(featureCollection.crs).to.deep.equal({
          "type": "name",
          "properties": {
            "name": "EPSG:4326"
          }
        });
      expect(featureCollection.features.length).to.be.above(0);
      done();
    });
  });
  it('srid parameteren respekteres ved geojson FeatureCollection', function(done) {
    request.get({url: 'http://localhost:3002/adresser?format=geojson&srid=25832&per_side=10', json: true}, function(error, response, body) {
      expect(body.crs).to.deep.equal({
        "type": "name",
        "properties": {
          "name": "EPSG:25832"
        }
      });
      done();
    });
  });
  it('srid parameteren respekteres ved geojson enkeltopslag', function(done) {
    request.get({url: 'http://localhost:3002/adresser/0a3f50a3-823b-32b8-e044-0003ba298018?format=geojson&srid=25832', json: true}, function(error, response, body) {
      expect(body.crs).to.deep.equal({
        "type": "name",
        "properties": {
          "name": "EPSG:25832"
        }
      });
      done();
    });
  });
});