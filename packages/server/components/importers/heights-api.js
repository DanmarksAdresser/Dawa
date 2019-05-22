const request = require('request-promise');
const url = require('url');
const { go } = require('ts-csp');

const logger = require('@dawadk/common/src/logger').forCategory('heights');
const importUtil = require('@dawadk/import-util/src/postgres-streaming');

const { roundHeight, importHeightsFromTable, createHeightTable } = require('../../heights/import-heights-util');

function hoejdeClient(apiUrl, accessToken) {
  return  (x, y) => go(function*() {
    const parsedUrl = url.parse(apiUrl, true);
    parsedUrl.query.geop = `${x},${y}`;
    delete parsedUrl.search;
    const formattedUrl = url.format(parsedUrl);
    const result = yield request.get({
      url: formattedUrl,
      json: true,
      headers: {
        Token: accessToken
      }
    });
    if (result.hoejde === null || result.hoejde === undefined || result.hoejde < -100) {
      logger.error('Got bad result from height service', {
        result,
        url: formattedUrl
      });
      throw new Error('Got bad result from height service');
    }
    return result.hoejde;
  });
}

const importHusnummerHeight = (client, txid, apiClient, husnummerid) => go(function*(){
  const rows = yield client.queryRows(`
        SELECT st_x(position) as x, st_y(position) as y
        FROM  dar1_husnummer_current hn join dar1_adressepunkt_current ap on hn.adgangspunkt_id = ap.id
          WHERE hn.id = $1`, [husnummerid]);
  if (rows.length === 1) {
    const row = rows[0];
    const {x, y} = row;
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
});

const importFromApi = (client, txid, apiClient) => go(function*() {
  const rows = yield client.queryRows(`
        SELECT H.husnummerid
        FROM hoejde_importer_afventer h JOIN dar1_adressepunkt_current ap on h.adgangspunktid = ap.id 
        LEFT JOIN hoejde_importer_disabled d ON h.husnummerid = d.husnummerid
        WHERE (disableuntil IS NULL OR disableuntil < NOW())
        ORDER BY h.husnummerid
        LIMIT 1
        `);
  if (rows.length === 1) {
    const row = rows[0];
    const {husnummerid} = row;
    return yield importHusnummerHeight(client, txid, apiClient, husnummerid);
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

const createApiReimporter = ({apiClient, husnummerid}) => {
  return {
    id: 'Heights-API-Reimport',
    description: 'Højdeimporter - API opslag - genimportering',
    execute: (client, txid, strategy, context) => go(function*() {
      const somethingToImport = yield importHusnummerHeight(client, txid, apiClient, husnummerid);
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
  hoejdeClient,
  createApiReimporter
};