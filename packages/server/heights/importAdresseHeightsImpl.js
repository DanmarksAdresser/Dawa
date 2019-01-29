"use strict";

const { go } = require('ts-csp');

const { withImportTransaction } = require('../importUtil/transaction-util');
const proddb = require('../psql/proddb');

const { materialize } = require('@dawadk/import-util/src/materialize');
const { createHeightImporter } = require('../components/importers/heights-csv');
const { createApiImporter, hoejdeClient } = require('../components/importers/heights-api');
const schemaModel = require('../psql/tableModel');
const { EXECUTION_STRATEGY } = require('../components/common');
const { execute } = require('../components/execute');

const materializeHeightDerived = (client, txid) => go(function*() {
  yield materialize(client, txid, schemaModel.tables, schemaModel.materializations.hoejder);
  yield materialize(client, txid, schemaModel.tables, schemaModel.materializations.hoejde_importer_afventer);
  yield materialize(client, txid, schemaModel.tables, schemaModel.materializations.adgangsadresser);
  yield materialize(client, txid, schemaModel.tables, schemaModel.materializations.adgangsadresser_mat);
  yield materialize(client, txid, schemaModel.tables, schemaModel.materializations.adresser_mat);
});

const importFromApi = (client, txid, apiClient) => go(function*() {
  const importer = createApiImporter({apiClient});
  return yield execute(client, txid, [importer], EXECUTION_STRATEGY.skipNonIncremental, {});
});
const importFromApiDaemon = (apiUrl, login, password) => go(function*() {
  const apiClient = hoejdeClient(apiUrl, login, password);
  /*eslint no-constant-condition: 0 */
  while (true) {
    const context = yield proddb.withTransaction('READ_WRITE', client =>
      withImportTransaction(client, 'importHøjderApi', (txid) =>
        importFromApi(client, txid, apiClient)));
    if(context.changes.hoejde_importer_resultater.total === 0) {
      break;
    }
  }
});

const importHeights = (client, txid, filePath) => go(function*() {
  const context = {};
  const importer = createHeightImporter({filePath});
  yield importer.execute(client, txid, context);
  yield materializeHeightDerived(client, txid);
});



module.exports = {
  importHeights,
  importFromApi,
  importFromApiDaemon
};
