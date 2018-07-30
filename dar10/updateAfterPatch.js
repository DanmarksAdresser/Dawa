"use strict";

const {go} = require('ts-csp');
const _ = require('underscore');

const {runImporter} = require('../importUtil/runImporter');
const importDarImpl = require('./importDarImpl');
const proddb = require('../psql/proddb');
const { withImportTransaction } = require('../importUtil/importUtil');
const initialization = require('../psql/initialization');
const path = require('path');
const { applyCurrentTableToChangeTable } = require('../importUtil/tableDiffNg');
const tableSchema = require('../psql/tableModel');

const optionSpec = {
  pgConnectionUrl: [false, 'URL som anvendes ved forbindelse til databasen', 'string'],
};

runImporter('importDar10', optionSpec, _.keys(optionSpec), function (args, options) {
  proddb.init({
    connString: options.pgConnectionUrl,
    pooled: false
  });

  return proddb.withTransaction('READ_WRITE', client => go(function*() {
    yield initialization.reloadDatabaseCode( client, path.join(__dirname, '../psql/schema'));
    yield client.query('UPDATE adgangsadresser a SET aendret = v.aendret FROM dar1_adgangsadresser_view v WHERE a.id = v.id');
    yield applyCurrentTableToChangeTable(client, tableSchema.tables.adgangsadresser, ['aendret']);
    yield client.query('UPDATE enhedsadresser a SET aendret = v.aendret FROM dar1_enhedsadresser_view v WHERE a.id = v.id');
    yield applyCurrentTableToChangeTable(client, tableSchema.tables.enhedsadresser, ['aendret']);
    yield client.query('UPDATE adgangsadresser_mat a SET aendret = v.aendret FROM adgangsadresser_mat_view v WHERE a.id = v.id');
    yield applyCurrentTableToChangeTable(client, tableSchema.tables.adgangsadresser_mat, ['aendret']);
    yield client.query('UPDATE adresser_mat a SET aendret = v.aendret, a_aendret = v.a_aendret FROM adresser_mat_view v WHERE a.id = v.id');
    yield applyCurrentTableToChangeTable(client, tableSchema.tables.adresser_mat, ['aendret', 'a_aendret']);
    yield withImportTransaction(client, 'updateAfterDataPatch', (txid) => go(function*() {
      yield importDarImpl.updateDawa(client, txid);
    }));
  }));
});