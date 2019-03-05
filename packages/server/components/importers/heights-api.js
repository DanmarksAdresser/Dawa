const request = require('request-promise');
const url = require('url');
const { go } = require('ts-csp');

const logger = require('@dawadk/common/src/logger').forCategory('heights');
const importUtil = require('@dawadk/import-util/src/postgres-streaming');

const { roundHeight, importHeightsFromTable, createHeightTable } = require('../../heights/import-heights-util');

function hoejdeClient(apiUrl, login, password) {
  return function (x, y) {
    const parsedUrl = url.parse(apiUrl, true);
    parsedUrl.query.login = login;
    parsedUrl.query.password = password;
    parsedUrl.query.geop = `${x},${y}`;
    delete parsedUrl.search;
    const formattedUrl = url.format(parsedUrl);
    return request.get({
      url: formattedUrl,
      json: true
    }).then(result => {
      if (result.hoejde === null || result.hoejde === undefined) {
        logger.error('Got bad result from height service', {
          result: result,
          url: formattedUrl
        });
        throw new Error(result);
      }
      return result.hoejde;
    });
  }
}

const importFromApi = (client, txid, apiClient) => go(function*() {
  const rows = yield client.queryRows(`
        SELECT H.husnummerid, adgangspunktid, st_x(position) as x, st_y(position) as y
        FROM hoejde_importer_afventer h JOIN dar1_adressepunkt_current ap on h.adgangspunktid = ap.id 
        LEFT JOIN hoejde_importer_disabled d ON h.husnummerid = d.husnummerid
        WHERE (disableuntil IS NULL OR disableuntil < NOW())
        ORDER BY h.husnummerid
        LIMIT 1
        `);
  if (rows.length === 1) {
    const row = rows[0];
    const {husnummerid, x, y} = row;
    logger.info('Importerer højde for husnummer', {husnummerid, x, y});
    try {
      const z = roundHeight(yield apiClient(x, y));
      logger.info('Modtog højde for husnummer', {husnummerid, x, y, z});
      yield createHeightTable(client, 'heights');
      yield client.query('INSERT INTO heights(id, x, y, z) VALUES ($1, $2, $3, $4)', [husnummerid, x, y, z]);
      yield importHeightsFromTable(client, txid, 'heights')
      logger.info('Højde indlæst for husnummer', {husnummerid, x, y, z});
      yield importUtil.dropTable(client, 'heights');
    }
    catch (e) {
      logger.error('Failed to import height from API', e);
      yield client.query(
`INSERT INTO hoejde_importer_disabled(husnummerid, disableuntil) 
VALUES ($1, NOW() + INTERVAL '1 day') ON CONFLICT (husnummerid) DO UPDATE set disableuntil = NOW() + INTERVAL '1 day'`,
        [husnummerid]);
    }
    return true;
  }
  else {
    logger.info('No heights to import');
    return false;
  }

});

const createApiImporter = ({ apiClient }) => {
  return {
    id: 'Heights-API',
    description: 'Højdeimporter - API opslag',
    execute: (client, txid, strategy, context) => go(function*() {
      const somethingToImport = yield importFromApi(client, txid, apiClient);
      if(somethingToImport) {
        // We need to prevent rollback because the table hoejde_importer_disabled
        // does not have a change table, and therefore changes to it is
        // not tracked by the component execution engine
        context['prevent-rollback'] = true;
      }
    }),
    produces: ['hoejde_importer_resultater', 'hoejde_importer_afventer'],
    requires: []
  };
};

module.exports = {
  createApiImporter,
  hoejdeClient
};