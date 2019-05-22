"use strict";

const { go } = require('ts-csp');

const proddb = require('../psql/proddb');

const { createHeightImporter } = require('../components/importers/heights-csv');
const { createApiImporter, createApiReimporter, hoejdeClient } = require('../components/importers/heights-api');
const { EXECUTION_STRATEGY } = require('../components/common');
const { execute, executeRollbackable } = require('../components/execute');


const importFromApi = (client, apiClient) => go(function*() {
  const importer = createApiImporter({apiClient});
  return yield executeRollbackable(client, 'importHøjderApi',
    [importer], EXECUTION_STRATEGY.quick, {});
});

const reimportFromApi = (client, apiClient, husnummerid) => go(function*() {
  const importer = createApiReimporter({apiClient, husnummerid});
  return yield executeRollbackable(client, 'importHøjderApi',
    [importer], EXECUTION_STRATEGY.quick, {});
});

const importFromApiDaemon = (apiUrl, accessToken) => go(function*() {
  const apiClient = hoejdeClient(apiUrl, accessToken);
  /*eslint no-constant-condition: 0 */
  while (true) {
    const context = yield proddb.withTransaction('READ_WRITE', client =>
        importFromApi(client, apiClient));
    if(context.changes.hoejde_importer_resultater.total === 0) {
      break;
    }
  }
});

const reimportHeights = (apiUrl, accessToken, husnummerIds) => go(function*() {
  const apiClient = hoejdeClient(apiUrl, accessToken);
  for(let husnummerid of husnummerIds) {
    yield proddb.withTransaction('READ_WRITE', client =>
      reimportFromApi(client, apiClient, husnummerid));
  }
});

const importHeights = (client, txid, filePath) => go(function*() {
  const importer = createHeightImporter({filePath});
  return yield execute(client, txid, [importer], EXECUTION_STRATEGY.slow, {});
});



module.exports = {
  importHeights,
  importFromApi,
  importFromApiDaemon,
  reimportHeights
};
