"use strict";

const {go} = require('ts-csp');
const {generateTemaTable} = require('../dagiImport/sqlGen');
const tableSchema = require('./tableModel');
const cliParameterParsing = require('../bbr/common/cliParameterParsing');
const proddb = require('./proddb');
const {withImportTransaction} = require('../importUtil/importUtil');
const importDagiImpl = require('../dagiImport/importDagiImpl');

const { makeChangesNonPublic }= require('../importUtil/materialize');
const optionSpec = {
  pgConnectionUrl: [false, 'URL som anvendes ved forbindelse til test database', 'string'],
};


cliParameterParsing.main(optionSpec, Object.keys(optionSpec), function (args, options) {
  proddb.init({
    connString: options.pgConnectionUrl,
    pooled: false
  });
  proddb.withTransaction('READ_WRITE', (client) => go(function* () {
    yield client.query(generateTemaTable('landpostnummer'));
    yield withImportTransaction(client, 'landpostnummer migrering', txid => go(function* () {
      yield importDagiImpl.importLandpostnummer(client, txid);
      yield makeChangesNonPublic(client, txid, tableSchema.tables.landpostnumre);
    }));
  })).done();
});

