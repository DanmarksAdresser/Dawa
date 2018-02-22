"use strict";
const { go } = require('ts-csp');
const {columnsEqualClause} = require('../darImport/sqlUtil');

const updateSubdividedTable =
  (client, txid, baseTable, divTable, keyColumnNames) => go(function* () {
    yield client.query(`DELETE FROM ${divTable} d USING ${baseTable}_changes t WHERE ${columnsEqualClause('d', 't', keyColumnNames)} AND txid = ${txid}`);
    yield client.query(`INSERT INTO ${divTable} (SELECT ${keyColumnNames.join(', ')}, splitToGridRecursive(geom, 64) AS geom FROM ${baseTable}_changes WHERE operation <> 'delete' AND txid = ${txid})`);
  });

const refreshSubdividedTable =
  (client, baseTable, divTable, keyColumnNames) => go(function* () {
    yield client.query(`DELETE FROM ${divTable}`);
    yield client.query(`INSERT INTO ${divTable} (SELECT ${keyColumnNames.join(', ')}, splitToGridRecursive(geom, 64) AS geom FROM ${baseTable})`);
  });

const updateGeometricFields = (client, txid, tableModel) => go(function* () {
  const table = tableModel.table;
  const changeTable = `${table}_changes`;
  yield client.query(`UPDATE ${changeTable} SET geo_version = 1, geo_ændret = NOW() WHERE operation = 'insert' and txid = ${txid}`);
  yield client.query(`UPDATE ${changeTable} SET ændret = NOW() WHERE operation = 'insert' OR operation = 'update' and txid = ${txid}`);
  yield client.query(`UPDATE ${changeTable} new SET geo_ændret = NOW(), geo_version = old.geo_version + 1
    FROM ${table} old WHERE ${columnsEqualClause('old', 'new', tableModel.primaryKey)} AND NOT ST_Equals(old.geom, new.geom) AND operation = 'update' and txid = ${txid}`);
});

module.exports = {
  updateSubdividedTable,
  updateGeometricFields,
  refreshSubdividedTable
};