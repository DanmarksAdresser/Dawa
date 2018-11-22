"use strict";

const {go} = require('ts-csp');
const cliParameterParsing = require('../bbr/common/cliParameterParsing');
const proddb = require('./proddb');

const {withImportTransaction} = require('../importUtil/importUtil');

const optionSpec = {
  pgConnectionUrl: [false, 'URL som anvendes ved forbindelse til test database', 'string']
};


cliParameterParsing.main(optionSpec, Object.keys(optionSpec), function (args, options) {
  proddb.init({
    connString: options.pgConnectionUrl,
    pooled: false
  });
  proddb.withTransaction('READ_WRITE', (client) => go(function* () {
    yield withImportTransaction(client, 'migrate_1_22_0', txid => go(function* () {
      yield client.query(`
ALTER TABLE kommuner ADD COLUMN udenforkommuneinddeling boolean;
ALTER TABLE kommuner_changes ADD COLUMN udenforkommuneinddeling boolean;
UPDATE kommuner SET udenforkommuneinddeling = false;
UPDATE kommuner_changes SET udenforkommuneinddeling = false;
`);
    }));
  })).done();
});

