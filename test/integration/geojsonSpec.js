"use strict";

var expect = require('chai').expect;
var request = require("request-promise");
var _       = require("underscore");

/*eslint no-console: 0*/

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
      expect(response.statusCode).to.equal(200);
      var feature = JSON.parse(body);
      expect(feature.properties.kvhx).to.equal("01551010__37_______");
      done();
    });
  });
  it('medtager kvh i adresse output', function(done) {
    request.get('http://localhost:3002/adgangsadresser/0a3f507b-b8e2-32b8-e044-0003ba298018?format=geojson', function(error, response, body) {
      expect(response.statusCode).to.equal(200);
      var feature = JSON.parse(body);
      expect(feature.properties.kvh).to.equal("01550966___6");
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

  it('Vejstykker kan hentes i nested GeoJSON format', () => {
    return request.get({url: 'http://localhost:3002/vejstykker?navn=Eliasgade&format=geojson&struktur=nestet', json: true}).then(result => {
      const feature = result.features[0];
      expect(Array.isArray(feature.properties.postnumre)).to.be.true;
      expect(feature.geometry).to.be.an('object');
    });
  });

  it('Adresser kan hentes i nested GeoJSON format', () => {
    return request.get({url: 'http://localhost:3002/adresser?vejnavn=Eliasgade&format=geojson&struktur=nestet', json: true}).then(result => {
      const feature = result.features[0];
      console.dir(result);
      expect(feature.properties.adgangsadresse.kommune.kode).to.match(/\d{4}/);
      expect(feature.geometry).to.be.an('object');
    });
  });

  it('Vejstykker kan hentes med z-koordinater GeoJSON format', () => {
    return request.get({url: 'http://localhost:3002/vejstykker?navn=Eliasgade&format=geojsonz', json: true}).then(result => {
      const coords = result.features[0].geometry.coordinates;
      expect(coords[0][0]).to.have.length(3);
    });
  });
  it('Adgangsadresser kan hentes med z-koordinater GeoJSON format', () => {
    return request.get({url: 'http://localhost:3002/adgangsadresser?id=0a3f507c-f9a0-32b8-e044-0003ba298018&format=geojsonz', json: true}).then(result => {
      const coords = result.features[0].geometry.coordinates;
      expect(coords).to.have.length(3);
    });
  });
  it('Adresser kan hentes med z-koordinater GeoJSON format', () => {
    return request.get({url: 'http://localhost:3002/adresser?id=0a3f50a3-885d-32b8-e044-0003ba298018&format=geojsonz', json: true}).then(result => {
      const coords = result.features[0].geometry.coordinates;
      expect(coords).to.have.length(3);
    });
  });
  it('Adgangsdresse-enkeltopslag respekterer geometri-parameteren', () => {
    return request.get({url: 'http://localhost:3002/adgangsadresser/0a3f507d-f25f-32b8-e044-0003ba298018?geometri=vejpunkt&format=geojsonz', json: true}).then(result => {
      const coords = result.geometry.coordinates;
      expect(coords).to.have.length(2);
      expect(coords[0]).to.equal(result.properties.vejpunkt_x);
      expect(coords[1]).to.equal(result.properties.vejpunkt_y);
    });
  });
  it('Adgangsadresse-opslag respekterer geometri-parameteren', () => {
    return request.get({url: 'http://localhost:3002/adgangsadresser?id=0a3f507d-f25f-32b8-e044-0003ba298018&geometri=vejpunkt&format=geojsonz', json: true}).then(result => {
      const coords = result.features[0].geometry.coordinates;
      expect(coords).to.have.length(2);
      expect(coords[0]).to.equal(result.features[0].properties.vejpunkt_x);
      expect(coords[1]).to.equal(result.features[0].properties.vejpunkt_y);
    });
  });

  it('Adresse-enkeltopslag respekterer geometri-parameteren', () => {
    return request.get({url: 'http://localhost:3002/adresser/0a3f50a3-885d-32b8-e044-0003ba298018?geometri=vejpunkt&format=geojsonz', json: true}).then(result => {
      const coords = result.geometry.coordinates;
      expect(coords).to.have.length(2);
      expect(coords[0]).to.equal(result.properties.vejpunkt_x);
      expect(coords[1]).to.equal(result.properties.vejpunkt_y);
    });
  });
  it('Adresse-opslag respekterer geometri-parameteren', () => {
    return request.get({url: 'http://localhost:3002/adresser?id=0a3f50a3-885d-32b8-e044-0003ba298018&geometri=vejpunkt&format=geojsonz', json: true}).then(result => {
      const coords = result.features[0].geometry.coordinates;
      expect(coords).to.have.length(2);
      expect(coords[0]).to.equal(result.features[0].properties.vejpunkt_x);
      expect(coords[1]).to.equal(result.features[0].properties.vejpunkt_y);
    });
  });
  it('Adgangsadresse-reverse respekterer geometri-parameteren', () => {
    return request.get({url: 'http://localhost:3002/adgangsadresser/reverse?x=750000&y=6100000&srid=25832&geometri=vejpunkt&format=geojson', json: true}).then(result => {
      const coords = result.geometry.coordinates;
      expect(coords).to.have.length(2);
      expect(coords[0]).to.equal(result.properties.vejpunkt_x);
      expect(coords[1]).to.equal(result.properties.vejpunkt_y);
    });
  });
});
