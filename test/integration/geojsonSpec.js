"use strict";

var request = require("request");
var _       = require("underscore");

describe('GeoJSON format', function() {
  it('Kan hente adresser i GeoJSON format', function(done) {
    request.get('http://localhost:3000/adresser?format=geojson&per_side=10', function(error, response, body) {
      expect(response.statusCode).toBe(200);
      var featureCollection = JSON.parse(body);
      expect(featureCollection.type).toBe('FeatureCollection');
      expect(featureCollection.crs).toEqual({
        "type": "name",
        "properties": {
          "name": "EPSG:4326"
        }
      });
      expect(featureCollection.features).toBeDefined();
      expect(_.isArray(featureCollection.features)).toBe(true);
      expect(featureCollection.features.length).toBe(10);
      expect(featureCollection.features[0].properties.id).toBeDefined();
      done();
    });
  });
  it('Kan lave opslag på adresse i GeoJSON format', function(done) {
    request.get('http://localhost:3000/adresser/0a3f50a3-823b-32b8-e044-0003ba298018?format=geojson', function(error, response, body) {
      expect(response.statusCode).toBe(200);
      var feature = JSON.parse(body);
      expect(feature.type).toBe('Feature');
      expect(feature.crs).toEqual({
        "type": "name",
        "properties": {
          "name": "EPSG:4326"
        }
      });
      expect(feature.properties).toBeDefined();
      expect(feature.properties.id).toBe("0a3f50a3-823b-32b8-e044-0003ba298018");
      done();
    });
  });
  it('srid parameteren respekteres ved geojson FeatureCollection', function(done) {
    request.get({url: 'http://localhost:3000/adresser?format=geojson&srid=25832&per_side=10', json: true}, function(error, response, body) {
      expect(body.crs).toEqual({
        "type": "name",
        "properties": {
          "name": "EPSG:25832"
        }
      });
      done();
    });
  });
  it('srid parameteren respekteres ved geojson enkeltopslag', function(done) {
    request.get({url: 'http://localhost:3000/adresser/0a3f50a3-823b-32b8-e044-0003ba298018?format=geojson&srid=25832', json: true}, function(error, response, body) {
      expect(body.crs).toEqual({
        "type": "name",
        "properties": {
          "name": "EPSG:25832"
        }
      });
      done();
    });
  });
});