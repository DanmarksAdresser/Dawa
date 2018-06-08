"use strict";

const {go} = require('ts-csp');
const cliParameterParsing = require('../bbr/common/cliParameterParsing');
const proddb = require('./proddb');

const { reloadDatabaseCode } = require('./initialization');
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
    yield reloadDatabaseCode(client, 'psql/schema');
    yield withImportTransaction(client, 'migrate_1_20_0', txid => go(function*() {
      yield client.query('DELETE FROM jordstykker_changes');
      yield client.query(`INSERT INTO jordstykker_changes(txid, operation,public,ejerlavkode,matrikelnr,kommunekode,regionskode,sognekode,retskredskode,esrejendomsnr,sfeejendomsnr,udvidet_esrejendomsnr,geom)
      (SELECT ${txid}, 'insert', 'false', ejerlavkode,matrikelnr,kommunekode,regionskode,sognekode,retskredskode,esrejendomsnr,sfeejendomsnr,udvidet_esrejendomsnr,geom FROM jordstykker)`);
    }));
    yield client.query('analyze');
  })).done();
});

