const { go } = require('ts-csp');
const {computeDifferencesSubset, applyChanges } = require('@dawadk/import-util/src/table-diff');
const schemaModel = require('../psql/tableModel');

function roundHeight(height) {
  if(height === null) {
    return null;
  }
  return Math.round(height * 10) / 10;
}

const createHeightTable = (client, tableName) => client.query(
  `CREATE TEMP TABLE ${tableName} (
    id uuid NOT NULL PRIMARY KEY,
    x double precision not null,
    y double precision not null,
    z double precision)`
);

const importHeightsFromTable = (client, txid, table) => go(function*() {
  yield client.query(`CREATE TEMP TABLE hoejde_importer_resultater_dirty AS 
    (SELECT hn.id as husnummerid FROM dar1_husnummer_current hn
       JOIN dar1_adressepunkt_current ap ON hn.adgangspunkt_id = ap.id
       LEFT JOIN hoejde_importer_resultater r ON r.husnummerid = hn.id
      JOIN ${table} h 
      ON hn.id = h.id AND 
       st_x(ap.position)::numeric(11,3) = h.x::numeric(11,3) AND 
       st_y(ap.position)::numeric(11,3) = h.y::numeric(11,3)
      WHERE (r.hoejde is distinct from h.z or (r.position is null or not st_equals(ap.position, r.position))))`);
  yield client.query(`CREATE TEMP VIEW hoejde_importer_resultater_view AS(
  select hn.id as husnummerid, z as hoejde, st_setsrid(st_point(x,y), 25832) as position
  FROM ${table} h 
  JOIN dar1_husnummer_current hn ON h.id = hn.id
  JOIN dar1_adressepunkt_current ap ON ap.id = hn.adgangspunkt_id)`);
  yield computeDifferencesSubset(client, txid,
    'hoejde_importer_resultater_view',
    'hoejde_importer_resultater_dirty',
    schemaModel.tables.hoejde_importer_resultater);
  yield applyChanges(client, txid, schemaModel.tables.hoejde_importer_resultater);
  yield client.query('DROP VIEW hoejde_importer_resultater_view');
  yield client.query('DROP table hoejde_importer_resultater_dirty');
});

module.exports = {
  roundHeight,
  importHeightsFromTable,
  createHeightTable
};