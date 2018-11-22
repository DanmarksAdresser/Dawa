"use strict";

const { go } = require('ts-csp');

var cliParameterParsing = require('../bbr/common/cliParameterParsing');
var proddb = require('./proddb');
const _ = require('underscore');
const schemaModel = require('./tableModel');
const {deriveColumn } = require('../importUtil/tableModelUtil');
var optionSpec = {
  pgConnectionUrl: [false, 'URL som anvendes ved forbindelse til databasen', 'string'],
  version: [false, 'Version af ordbøger, som skal anvendes', 'string']
};

cliParameterParsing.main(optionSpec,['pgConnectionUrl', 'version'], function(args, options) {
  proddb.init({
    connString: options.pgConnectionUrl,
    pooled: false
  });


  proddb.withTransaction('READ_WRITE', (client) => go(function*() {
    yield client.query(
`
CREATE EXTENSION IF NOT EXISTS dict_xsyn; CREATE EXTENSION IF NOT EXISTS unaccent;
DROP TEXT SEARCH DICTIONARY IF EXISTS adresser_xsyn_${options.version} CASCADE;
CREATE TEXT SEARCH DICTIONARY adresser_xsyn_${options.version}(
  template=xsyn_template, rules=adresser_xsyn_${options.version}, matchsynonyms=true
);
DROP TEXT SEARCH DICTIONARY IF EXISTS adresser_unaccent_${options.version} CASCADE;
CREATE TEXT SEARCH DICTIONARY adresser_unaccent_${options.version}(
  template=unaccent, rules=adresser_unaccent_${options.version}
);
DROP TEXT SEARCH CONFIGURATION IF EXISTS adresser CASCADE;
CREATE TEXT SEARCH CONFIGURATION adresser (copy=simple);
ALTER TEXT SEARCH CONFIGURATION adresser
  ALTER MAPPING FOR asciiword,word,numword,asciihword,hword,numhword
  WITH adresser_unaccent_${options.version}, adresser_xsyn_${options.version}, simple;
DROP TEXT SEARCH CONFIGURATION IF EXISTS adresser_query CASCADE;
CREATE TEXT SEARCH CONFIGURATION adresser_query (copy=simple);
ALTER TEXT SEARCH CONFIGURATION adresser_query
  ALTER MAPPING FOR asciiword,word,numword,asciihword,hword,numhword
  WITH adresser_unaccent_${options.version}, simple;
`);
    for(let tableModel of Object.values(schemaModel.tables)) {
      const tsvColumn = _.findWhere(tableModel.columns, {name: 'tsv'});
      if(tsvColumn) {
        yield deriveColumn(client, tableModel.table, tableModel, 'tsv');
      }
    }
  })).done();
});
