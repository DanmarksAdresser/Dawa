"use strict";

const expect = require('chai').expect;
const request = require("request-promise");
const q = require('q');

describe('Jordstykke API', () => {
  it('Query på både ejerlav og matrikelnr', q.async(function*() {
    const result = yield request.get({url: 'http://localhost:3002/jordstykker?ejerlavkode=60851&matrikelnr=1a', json: true});
    expect(result.length).to.equal(1);
  }));
});
