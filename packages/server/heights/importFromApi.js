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
  login: {
    format: 'string',
    doc: 'Login til kortforsyningen',
    default: 'dawa',
    cli: true
  },
  password: {
    format: 'string',
    sensitive: true,
    doc: 'Password til kortforsyningen',
    cli: true,
    default: null,
    required: true
  }
}

runConfiguredImporter("højder", schema, config => go(function* () {
  proddb.init({
    connString: config.get('database_url'),
    pooled: false
  });

  yield importAdresseHeightsImpl.importFromApiDaemon(config.get('url'), config.get('login'), config.get('password'));
}));
