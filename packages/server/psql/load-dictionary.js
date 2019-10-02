#!/usr/bin/env node
"use strict";

const {go} = require('ts-csp');

const runConfiguredImporter = require('@dawadk/import-util/src/run-configured-importer');
const proddb = require('../psql/proddb');
const schema = {
  dictionary_version: {
    doc: 'Version af ordbøger, som skal anvendes',
    format: 'string',
    cli: true,
    required: true,
    default: null
  },
}
runConfiguredImporter('load-dictionary', schema, function (config) {
  proddb.init({
    connString: config.get('database_url'),
    pooled: false
  });
  const dictVersion = config.get('dictionary_version');
  return proddb.withTransaction('READ_WRITE', client => go(function*() {
    yield client.query(
        `
CREATE EXTENSION IF NOT EXISTS dict_xsyn; CREATE EXTENSION IF NOT EXISTS unaccent;
DROP TEXT SEARCH DICTIONARY IF EXISTS adresser_xsyn_${dictVersion} CASCADE;
CREATE TEXT SEARCH DICTIONARY adresser_xsyn_${dictVersion}(
  template=xsyn_template, rules=adresser_xsyn_${dictVersion}, matchsynonyms=true
);
DROP TEXT SEARCH DICTIONARY IF EXISTS adresser_unaccent_${dictVersion} CASCADE;
CREATE TEXT SEARCH DICTIONARY adresser_unaccent_${dictVersion}(
  template=unaccent, rules=adresser_unaccent_${dictVersion}
);
DROP TEXT SEARCH CONFIGURATION IF EXISTS adresser CASCADE;
CREATE TEXT SEARCH CONFIGURATION adresser (copy=simple);
ALTER TEXT SEARCH CONFIGURATION adresser
  ALTER MAPPING FOR asciiword,word,numword,asciihword,hword,numhword
  WITH adresser_unaccent_${dictVersion}, adresser_xsyn_${dictVersion}, simple;
DROP TEXT SEARCH CONFIGURATION IF EXISTS adresser_query CASCADE;
CREATE TEXT SEARCH CONFIGURATION adresser_query (copy=simple);
ALTER TEXT SEARCH CONFIGURATION adresser_query
  ALTER MAPPING FOR asciiword,word,numword,asciihword,hword,numhword
  WITH adresser_unaccent_${dictVersion}, simple;
`);
  }));
});