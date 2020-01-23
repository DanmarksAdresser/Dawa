"use strict";

const {go} = require('ts-csp');
const {assert} = require('chai');
const request = require("request-promise");
const config = require('@dawadk/common/src/config/holder').getConfig();
const baseUrl = config.get('test.dawa_base_url');

describe('Download parameter', () => {
    it("Sætter Content-Disposition header hvis download parameter angives", () => go(function* () {
        const response = yield request.get({
            url: `${baseUrl}/adresser?per_side=1&download`,
            json: true,
            resolveWithFullResponse: true
        });
        assert.strictEqual(response.headers['content-disposition'], 'attachment');
    }));
    it("Sætter Content-Disposition header med filnavn hvis download parameter angives med filnavn", () => go(function* () {
        const response = yield request.get({
            url: `${baseUrl}/adresser?per_side=1&download=%C3%A6%C3%B8%C3%A5`,
            json: true,
            resolveWithFullResponse: true
        });
        assert.strictEqual(response.headers['content-disposition'], `attachment; filename*=UTF-8''%C3%A6%C3%B8%C3%A5`);
    }));

});
