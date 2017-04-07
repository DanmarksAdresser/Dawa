"use strict";

const q = require('q');
const _ = require('underscore');

const flats = require('./flats');
const sqlCommon =  require('../../psql/common');
const sqlSpecs = require('./sqlSpecs');
const sqlUtil = require('../../darImport/sqlUtil');
const tilknytninger = require('./tilknytninger/tilknytninger');
const promisingStreamCombiner = require('../../promisingStreamCombiner');
const importUtil = require('../../importUtil/importUtil');
const tablediff = require('../../importUtil/tablediff');

const columnsEqualClause = sqlUtil.columnsEqualClause;

function fetchTableName(sqlSpec) {
  return `fetch_${sqlSpec.table}`;
}

function createFetchTable(client, flat, sqlSpec) {
  const fetchTable = fetchTableName(sqlSpec);
  return client.queryp(`CREATE TEMP TABLE ${fetchTable} AS (SELECT ${_.pluck(flat.fields, 'name').concat(['geom']).join(',')} FROM ${sqlSpec.table} WHERE false)`);
}

function streamToTable(client, flatName, table, srcStream, mappers) {
  return q.async(function*() {
    const flat = flats[flatName];
    const columnNames = _.pluck(flat.fields, 'name').concat('geom');
    const stringifier = importUtil.copyStreamStringifier(columnNames);
    const copyStream = importUtil.copyStream(client, table, columnNames);
    yield promisingStreamCombiner([srcStream].concat(mappers).concat([stringifier, copyStream]));
  })();
}

function updateAdgangsadresserRelation(client, flat, sqlSpec, tilknytning, initial, sanityCheck,
forceUnique) {
  return q.async(function*() {
    const table = sqlSpec.table;
    const relTable = `${table}_adgadr`;
    const relHistoryTable = `${relTable}_history`;
    const keyFieldColumns = flat.key.map(key => tilknytning.keyFieldColumns[key]);
    const srcTable = sqlSpec.subdividedGeometryIndex ? `${table}_divided` : table;
    const selectList = flat.key.map(column => `f.${column}`).concat(['a.id']).join(',');
    const relTableColumns = keyFieldColumns.concat(['adgangsadresse_id']);
    const insertList = relTableColumns.join(',');

    if(initial) {
      yield sqlCommon.disableTriggersQ(client);
      yield client.queryp(
        `INSERT INTO ${relTable}(${insertList}) 
        (SELECT DISTINCT ${selectList} FROM adgangsadresser_mat a 
         JOIN ${srcTable} f ON ST_Covers(f.geom, a.geom))`);
      yield client.queryp(
        `INSERT INTO ${relHistoryTable}(${insertList}) 
        (SELECT ${insertList} from ${relTable})`);
      yield sqlCommon.enableTriggersQ(client);
    }
    else {
      const changedIdsSelectList = Object.keys(tilknytning.keyFieldColumns).map(keyName => `${keyName} as ${tilknytning.keyFieldColumns[keyName]}`).join(', ');
      yield client.queryp(`CREATE TEMP TABLE changed_ids AS ((SELECT ${changedIdsSelectList} from insert_${table})
      UNION (select ${changedIdsSelectList} from update_${table})
      UNION (select ${changedIdsSelectList} from delete_${table}))`);

      const selectFlatKeys = Object.keys(tilknytning.keyFieldColumns).map(key => {
        const column = tilknytning.keyFieldColumns[key];
        return `f.${key} as ${column}`;
      }).concat(['a.id as adgangsadresse_id']).join(', ');
      yield client.queryp(`CREATE TEMP VIEW desired_view AS \
(SELECT DISTINCT ${selectFlatKeys} \
FROM ${srcTable} f JOIN adgangsadresser_mat a ON ST_Covers(f.geom, a.geom))`);

      yield tablediff.computeDifferencesSubset(
        client, 'changed_ids', 'desired_view', relTable, relTableColumns, []);
      if(sanityCheck) {
        yield sanityCheck(client)
      }

      yield client.queryp('DROP VIEW desired_view');

      yield importUtil.dropTable(client, 'changed_ids');
      yield tablediff.applyChanges(client, relTable, relTable, relTableColumns,
        relTableColumns, [], true);
      yield tablediff.dropChangeTables(client, relTable);
    }
  })();
}

function importFlat(client, flatName, srcStream, mappers, initial, sanityCheck, createSubsetTableFn, forceUniqueTilknytning) {
  return q.async(function*() {
    const flat = flats[flatName];
    const sqlSpec = sqlSpecs[flatName];
    const table = sqlSpec.table;
    const columns = _.pluck(flat.fields, 'name').concat('geom');
    const idColumns = flat.key;
    const nonIdColumns = _.difference(columns, idColumns);
    if (initial) {
      yield streamToTable(client, flatName, table, srcStream, mappers);
    }
    else {
      const fetchTable = fetchTableName(sqlSpec);
      yield createFetchTable(client, flat, sqlSpec);
      yield streamToTable(client, flatName, fetchTable, srcStream, mappers);
      if(createSubsetTableFn) {
        const subsetTable = yield createSubsetTableFn(fetchTable);
        yield tablediff.computeDifferencesSubset(client, subsetTable, fetchTable, table, flat.key, nonIdColumns);
      }
      else {
        yield tablediff.computeDifferences(client, fetchTable, table, flat.key, nonIdColumns);
      }
      yield importUtil.dropTable(client, fetchTable);
      yield client.queryp(`UPDATE ${table} f SET ændret = NOW()
       FROM update_${table} u
       WHERE ${columnsEqualClause('f', 'u', flat.key)}`);
      yield client.queryp(`UPDATE ${table} f SET geo_ændret = NOW(), geo_version=geo_version+1
       FROM update_${table} u WHERE ${columnsEqualClause('f', 'u', flat.key)} AND f.geom IS DISTINCT FROM u.geom`);
      yield tablediff.applyChanges(client, table, table, idColumns, columns, nonIdColumns);
    }
    if (sqlSpec.subdividedGeometryIndex) {
      if (initial) {
        yield client.queryp(`INSERT INTO ${table}_divided(id, geom) (SELECT id, splitToGridRecursive(geom, 64) AS geom FROM ${table})`);
      }
      else {
        yield client.queryp(`DELETE FROM ${table}_divided d USING update_${table} f WHERE d.id = f.id`);
        yield client.queryp(`DELETE FROM ${table}_divided d USING delete_${table} f WHERE d.id = f.id`);
        yield client.queryp(`INSERT INTO ${table}_divided(id, geom) (SELECT id, splitToGridRecursive(geom, 64) AS geom FROM insert_${table})`);
        yield client.queryp(`INSERT INTO ${table}_divided(id, geom) (SELECT id, splitToGridRecursive(geom, 64) AS geom FROM update_${table})`);
      }
    }
    const tilknytning = tilknytninger[flatName];
    yield updateAdgangsadresserRelation(client, flat, sqlSpec, tilknytning, initial, sanityCheck, forceUniqueTilknytning);
    yield tablediff.dropChangeTables(client, table);
  })();
}

module.exports = {
  createFetchTable,
  streamToTable,
  importFlat
};
