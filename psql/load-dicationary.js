"use strict";

var async = require('async');

var sqlCommon = require('./common');

var cliParameterParsing = require('../bbr/common/cliParameterParsing');

var optionSpec = {
  pgConnectionUrl: [false, 'URL som anvendes ved forbindelse til databasen', 'string'],
  version: [false, 'Version af ordbøger, som skal anvendes', 'string']
};

function exitOnErr(err){
  if (err){
    throw new Error(err);
  }
}
cliParameterParsing.main(optionSpec,['pgConnectionUrl', 'version'], function(args, options) {
  sqlCommon.withWriteTranaction(options.pgConnectionUrl, function(err, client, commit) {
    exitOnErr(err);
    async.series([
      function(callback){
        client.query('CREATE EXTENSION IF NOT EXISTS dict_xsyn; CREATE EXTENSION IF NOT EXISTS unaccent;', [], callback);
      },
      function(callback) {
        client.query(
          'DROP TEXT SEARCH DICTIONARY IF EXISTS adresser_xsyn_' + options.version + ' CASCADE;' +
            'CREATE TEXT SEARCH DICTIONARY adresser_xsyn_' + options.version + '(' +
            ' template=xsyn_template, rules=adresser_xsyn_' + options.version + ', matchsynonyms=true' +
          ')', [], callback);
      },
      function(callback) {
        client.query(
          'DROP TEXT SEARCH DICTIONARY IF EXISTS adresser_unaccent_' + options.version + ' CASCADE;' +
            'CREATE TEXT SEARCH DICTIONARY adresser_unaccent_' + options.version + '(' +
            ' template=unaccent, rules=adresser_unaccent_' + options.version +
            ')', [], callback);
      },
      function(callback) {
        client.query(
          'DROP TEXT SEARCH CONFIGURATION IF EXISTS adresser CASCADE;' +
          'CREATE TEXT SEARCH CONFIGURATION adresser (copy=simple);' +
          'ALTER TEXT SEARCH CONFIGURATION adresser ' +
          'ALTER MAPPING FOR asciiword,word,numword,asciihword,hword,numhword ' +
          'WITH adresser_unaccent_' + options.version + ', adresser_xsyn_' + options.version + ', simple;', [], callback);
      },
      sqlCommon.disableTriggers(client),
      sqlCommon.psqlScript(client, __dirname, 'reindex-search.sql'),
      sqlCommon.enableTriggers(client),
      function(callback) {
        commit(null, function(err) {
          callback(err);
        });
      }
    ], function(err) {
      exitOnErr(err);
      console.log('done!');
    });
  });
});