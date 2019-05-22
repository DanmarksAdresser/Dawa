#!/usr/bin/env node
"use strict";

const { go } = require('ts-csp');
const runConfiguredImporter = require('@dawadk/import-util/src/run-configured-importer');
const importAdresseHeightsImpl = require('./importAdresseHeightsImpl');
const proddb = require('../psql/proddb');
const fs = require('fs');

const schema = {
  url: {
    format: 'string',
    doc: 'API URL',
    default: 'http://services.kortforsyningen.dk/?servicename=RestGeokeys_v2&method=hoejde',
    cli: true
  },
  access_token: {
    format: 'string',
    doc: 'Access token til kortforsyningen',
    default: null,
    cli: true,
    required: true
  },
  husnummer_file: {
    format: 'string',
    doc: 'File with husnummer IDs to reimport as JSON array',
    default: null,
    cli: true,
    required: true
  }
}

runConfiguredImporter("højder", schema, config => go(function* () {
  proddb.init({
    connString: config.get('database_url'),
    pooled: false
  });
  const husnummerIds = JSON.parse(fs.readFileSync(config.get('husnummer_file'), { encoding: 'utf-8'}));
  yield importAdresseHeightsImpl.reimportHeights(
    config.get('url'),
    config.get('access_token'),
    husnummerIds);
}));
