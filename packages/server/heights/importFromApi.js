#!/usr/bin/env node
"use strict";

const { go } = require('ts-csp');
const runConfiguredImporter = require('@dawadk/import-util/src/run-configured-importer');
const importAdresseHeightsImpl = require('./importAdresseHeightsImpl');
const proddb = require('../psql/proddb');

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
  }
}

runConfiguredImporter("højder", schema, config => go(function* () {
  proddb.init({
    connString: config.get('database_url'),
    pooled: false
  });

  yield importAdresseHeightsImpl.importFromApiDaemon(config.get('url'), config.get('access_token'));
}));
