"use strict";

const { go } = require('ts-csp');
const expect = require('chai').expect;
const request = require("request-promise");
const q = require('q');

describe('Jordstykke API', () => {
  it('Query på både ejerlav og matrikelnr', q.async(function*() {
    const result = yield request.get({url: 'http://localhost:3002/jordstykker?ejerlavkode=60851&matrikelnr=1a', json: true});
    expect(result.length).to.equal(1);
  }));

  it('Kan hente jordstykke i GeoJSON-format', () => go(function*() {
    const result = yield request.get({url: 'http://localhost:3002/jordstykker?ejerlavkode=60851&matrikelnr=1a&format=geojson', json: true});
    expect(result.features.length).to.equal(1);
    const properties = result.features[0].properties;
    expect(properties.ejerlavkode).to.equal(60851);
    expect(properties.matrikelnr).to.equal("1a");
  }));

  it('Kan lave reverse geocoding af jordstykke', () => go(function*() {
    const results = yield request.get({url: 'http://localhost:3002/jordstykker?srid=25832&x=685477.186430184&y=6159305.17270726', json: true});
    expect(results.length).to.equal(1);
    const jordstykke = results[0];
    expect(jordstykke.ejerlav.kode).to.equal(60851);
    expect(jordstykke.matrikelnr).to.equal("4b");
  }));

  it('Kan lave søgning i jordstykker', () => go(function*() {
    const results = yield request.get({url: 'http://localhost:3002/jordstykker?q=1a borup', json: true});
    expect(results.length).to.equal(1);
    const jordstykke = results[0];
    expect(jordstykke.ejerlav.kode).to.equal(60851);
    expect(jordstykke.matrikelnr).to.equal("1a");

  }));
  it('Kan lave autocomplete af jordstykke', () => go(function*() {
    const results = yield request.get({url: 'http://localhost:3002/jordstykker/autocomplete?q=1a bor', json: true});
    expect(results.length).to.equal(1);
    expect(results[0].tekst).to.equal("1a Borup, Osted (60851)");
    const jordstykke = results[0].jordstykke;
    expect(jordstykke.ejerlav.kode).to.equal(60851);
    expect(jordstykke.matrikelnr).to.equal("1a");
  }));
});
