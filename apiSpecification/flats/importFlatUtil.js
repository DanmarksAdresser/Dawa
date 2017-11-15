"use strict";

const { go } = require('ts-csp');
const _ = require('underscore');
const tablediff = require('../../importUtil/tablediff');
const tableDiffNg = require('../../importUtil/tableDiffNg');
const { columnsEqualClause } = require('../../darImport/sqlUtil');

const initializeSubdividedTable = (client, table) =>
  client.query(`INSERT INTO ${table}_divided(id, geom) (SELECT id, splitToGridRecursive(geom, 64) AS geom FROM ${table})`);

const updateSubdividedTable = (client, table) => go(function*() {
  yield client.queryp(`DELETE FROM ${table}_divided d USING update_${table} f WHERE d.id = f.id`);
  yield client.queryp(`DELETE FROM ${table}_divided d USING delete_${table} f WHERE d.id = f.id`);
  yield client.queryp(`INSERT INTO ${table}_divided(id, geom) (SELECT id, splitToGridRecursive(geom, 64) AS geom FROM insert_${table})`);
  yield client.queryp(`INSERT INTO ${table}_divided(id, geom) (SELECT id, splitToGridRecursive(geom, 64) AS geom FROM update_${table})`);
});

const updateSubdividedTableNg = (client, txid, table, forcePolygons) => go(function*() {
  yield client.query(`DELETE FROM ${table}_divided d USING ${table}_changes c WHERE txid = ${txid} AND d.id = c.id`);
  yield client.query(`INSERT INTO ${table}_divided(id, geom) (SELECT id, splitToGridRecursive(geom, 64, $1) AS geom 
  FROM ${table}_changes 
  WHERE txid = ${txid} AND operation <> 'delete')`, [forcePolygons]);
});

const updateGeometricTable = (client, table, idColumns, allColumns, columnsToUpdate) => go(function*() {
  yield client.queryp(`UPDATE ${table} f SET ændret = NOW()
       FROM update_${table} u
       WHERE ${columnsEqualClause('f', 'u', idColumns)}`);
  yield client.queryp(`UPDATE ${table} f SET geo_ændret = NOW(), geo_version=geo_version+1
       FROM update_${table} u WHERE ${columnsEqualClause('f', 'u', idColumns)} AND f.geom IS DISTINCT FROM u.geom`);
  yield tablediff.applyChanges(client, table, table, idColumns, allColumns, columnsToUpdate);
});

const updateGeometricTableNg = (client, txid, tableModel) => go(function*() {
  const table = tableModel.table;
  yield client.query(`UPDATE ${table}_changes c 
  SET geo_version= CASE WHEN C.geom IS DISTINCT FROM T.geom THEN t.geo_version + 1 ELSE t.geo_version END,
      geo_ændret= CASE WHEN C.geom IS DISTINCT FROM T.geom THEN NOW() ELSE t.geo_ændret END
  FROM ${table} t 
  WHERE c.txid = ${txid} AND ${columnsEqualClause('t', 'c', tableModel.primaryKey)}`);
  yield client.query(`UPDATE ${table}_changes SET ændret = NOW() WHERE txid = ${txid}`);
  yield client.query(`UPDATE ${table}_changes SET geo_version = 1, geo_ændret = NOW() WHERE txid = ${txid} and geo_version IS NULL`);
  yield tableDiffNg.applyChanges(client, txid, tableModel);
});

const refreshAdgangsadresserRelation = (client, geomIdColumns, geomTable, relIdColumns, relTable) => go(function*() {
  const selectClause = _.zip(geomIdColumns, relIdColumns).map(([geomId, relId]) => `f.${geomId} as ${relId}`).concat('a.id as adgangsadresse_id').join(', ');
  const relTableColumns = relIdColumns.concat('adgangsadresse_id');
  yield client.queryp(`CREATE TEMP table desired_view AS \
(SELECT DISTINCT  ${selectClause} \
FROM ${geomTable} f JOIN adgangsadresser_mat a ON ST_Covers(f.geom, a.geom))`);
  yield tablediff.computeDifferences(
    client, 'desired_view', relTable, relTableColumns, []);
  yield client.queryp('DROP table desired_view');
  yield tablediff.applyChanges(client, relTable, relTable, relTableColumns,
    relTableColumns, [], true);
  yield tablediff.dropChangeTables(client, relTable);
});

const refreshAdgangsadresserRelationNg = (client, txid, geomIdColumns, geomTable, relIdColumns, tableModel) => go(function*() {
  const selectClause = _.zip(geomIdColumns, relIdColumns).map(([geomId, relId]) => `f.${geomId} as ${relId}`).concat('a.id as adgangsadresse_id').join(', ');
  yield client.queryp(`CREATE TEMP table desired_view AS \
(SELECT DISTINCT  ${selectClause} \
FROM ${geomTable} f JOIN adgangsadresser_mat a ON ST_DWithin(f.geom, a.geom, 0))`);
  yield tableDiffNg.computeDifferences(
    client, txid, 'desired_view', tableModel, ['stednavn_id', 'adgangsadresse_id']);
  yield client.query(`DROP table desired_view; ANALYZE ${tableModel.table}_changes`);
  yield tableDiffNg.applyChanges(client, txid, tableModel);
});

module.exports = {
  initializeSubdividedTable,
  updateSubdividedTable,
  updateGeometricTable,
  updateGeometricTableNg,
  refreshAdgangsadresserRelation,
  refreshAdgangsadresserRelationNg,
  updateSubdividedTableNg
};
