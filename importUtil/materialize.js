"use strict";

const {assert} = require('chai');
const {go} = require('ts-csp');
const _ = require('underscore');

const {selectList} = require('../darImport/sqlUtil');
const {
  computeInsertsSubset, computeUpdatesSubset, computeDeletesSubset, applyChanges,
  initializeFromScratch, computeDifferences, assignSequenceNumbersToDependentTables
} = require('./tableDiffNg');
const schemaModel = require('../psql/tableModel');
const temaModels = require('../dagiImport/temaModels');
const dar10TableModels = require('../dar10/dar10TableModels');
const replikeringDataModel = require('../apiSpecification/replikering/datamodel');


const createTempDirtyTable = (client, tableModel) => {
  const selectClause = selectList(null, tableModel.primaryKey);
  return client.query(
    `CREATE TEMP TABLE ${tableModel.table}_dirty AS 
     (SELECT ${selectClause} FROM ${tableModel.table} WHERE false)`);
};

const dropTempDirtyTable = (client, tableModel) => {
  return client.query(`DROP TABLE ${tableModel.table}_dirty`);
};

/**
 * Compute dirty rows for a materialization
 * @param client
 * @param txid transaction ID
 * @param tablemodels collection of tableModels referenced in materialization
 * @param materialization description of the materialized view
 * @param srcTable the table in which dirty rows are found. May be a view.
 * @param targetTable table to store dirty rows. Only keys are stored.
 */
const computeDirtyPart = (client, txid, tablemodels, materialization, srcTable, targetTable) => {
  return go(function* () {
    const tableModel = tablemodels[materialization.table];
    const matKeySelect = tableModel.primaryKey.map(col => `t.${col}`).join(', ');
    const dirtySelects = materialization.dependents.map(dependent => {
      const dependentTableModel = tablemodels[dependent.table];
      assert(dependentTableModel);
      const references = dependent.references || dependentTableModel.primaryKey;
      assert.isObject(dependentTableModel);
      assert.isArray(references);
      assert.strictEqual(references.length, dependent.columns.length);
      const joinClause = dependent.columns.map((column, index) => {
        const pkColumn = references[index];
        return `t.${column} = c.${pkColumn}`;
      }).join(' AND ');
      return `SELECT ${matKeySelect} FROM ${srcTable} t JOIN ${dependent.table}_changes c ON ${joinClause} and txid = ${txid}`;
    });
    const sql = `INSERT INTO ${targetTable} (${dirtySelects.join(' UNION ')})`;
    yield client.query(sql);
  });
};

const computeDirty = (client, txid, tablemodels, materialization) => go(function* () {
  const tableModel = tablemodels[materialization.table];
  yield createTempDirtyTable(client, tableModel);
  yield computeDirtyPart(client, txid, tablemodels, materialization, materialization.table,
    `${materialization.table}_dirty`);
  yield computeDirtyPart(client, txid, tablemodels, materialization, materialization.view,
    `${materialization.table}_dirty`);
  yield client.query(`ANALYZE ${materialization.table}_dirty`);
});


const createChangeTable = (client, srcTableName) => go(function* () {
  const changeTableName = `${srcTableName}_changes`;
  yield client.query(
    `CREATE TABLE ${changeTableName} as (SELECT null::integer as txid, null::integer as changeid, null::operation_type as operation, null::boolean as public, ${srcTableName}.* FROM ${srcTableName} WHERE false);
     ALTER TABLE ${changeTableName} ALTER COLUMN txid SET NOT NULL;
     ALTER TABLE ${changeTableName} ALTER COLUMN operation SET NOT NULL;
     ALTER TABLE ${changeTableName} ALTER COLUMN public SET NOT NULL;
     CREATE INDEX ON ${changeTableName}(txid, operation);
     CREATE INDEX ON ${changeTableName}(changeid, public)`);
});

const computeMaterializedColumns = (tableModel, materialization) => {
  const excludedColumns = materialization.excludedColumns || [];
  const allColumns = tableModel.columns.map(col => col.name);
  return _.difference(allColumns, excludedColumns);
};

const computeInserts = (client, txid, tableModels, materialization) => {
  const tableModel = tableModels[materialization.table];
  const includedColumns = computeMaterializedColumns(tableModel, materialization);
  return computeInsertsSubset(client, txid, materialization.view, `${tableModel.table}_dirty`, tableModel, includedColumns);
};

const computeDeletes = (client, txid, tableModels, materialization) => {
  const tableModel = tableModels[materialization.table];
  return computeDeletesSubset(client, txid, materialization.view, `${tableModel.table}_dirty`, tableModel);
};


const computeUpdates = (client, txid, tableModels, materialization) => {
  const tableModel = tableModels[materialization.table];
  const includedColumns = computeMaterializedColumns(tableModel, materialization);
  return computeUpdatesSubset(client, txid, materialization.view, `${tableModel.table}_dirty`, tableModel, includedColumns);
};

const computeChanges = (client, txid, tableModels, materialization) => go(function* () {
  yield computeInserts(client, txid, tableModels, materialization);
  yield computeUpdates(client, txid, tableModels, materialization);
  yield computeDeletes(client, txid, tableModels, materialization);
});

const materialize = (client, txid, tableModels, materialization) => go(function* () {
  const tableModel = tableModels[materialization.table];

  assert(tableModel);
  if(materialization.computeDirty) {
    yield createTempDirtyTable(client, tableModel);
    yield materialization.computeDirty(client, txid);
  }
  else {
    yield computeDirty(client, txid, tableModels, materialization);
  }
  yield computeChanges(client, txid, tableModels, materialization);
  yield applyChanges(client, txid, tableModel);
  yield dropTempDirtyTable(client, tableModel);
});

const materializeFromScratch = (client, txid, tablemodels, materialization) => go(function* () {
  const model = tablemodels[materialization.table];
  yield initializeFromScratch(client, txid, materialization.view, model);
  yield client.query(`ANALYZE ${materialization.table}`);

});

const recomputeMaterialization = (client, txid, tableModels, materialization) => go(function* () {
  yield client.query(`create temp table desired as (SELECT * FROM ${materialization.view})`);
  yield client.query(`ANALYZE desired`);
  const tableModel = tableModels[materialization.table];
  const includedColumns = computeMaterializedColumns(tableModel, materialization);
  yield computeDifferences(client, txid, 'desired', tableModels[materialization.table], includedColumns);
  yield client.query(`analyze ${materialization.table}_changes`);
  yield client.query('DROP TABLE desired');
  yield applyChanges(client, txid, tableModels[materialization.table]);
});


const materializeDawa = (client, txid) => go(function* () {
  yield materialize(client, txid, schemaModel.tables, schemaModel.materializations.adgangsadresser_mat);
  yield materialize(client, txid, schemaModel.tables, schemaModel.materializations.adresser_mat);
  yield materialize(client, txid, schemaModel.tables, schemaModel.materializations.jordstykker_adgadr);
  yield materialize(client, txid, schemaModel.tables, schemaModel.materializations.stedtilknytninger);
  for (let model of temaModels.modelList) {
    if(!model.withoutTilknytninger) {
      yield materialize(client, txid, schemaModel.tables, schemaModel.materializations[model.tilknytningTable]);
    }
  }
  yield materialize(client, txid, schemaModel.tables, schemaModel.materializations.tilknytninger_mat);
  yield materialize(client, txid, schemaModel.tables, schemaModel.materializations.ikke_brofaste_adresser);
});

const recomputeTemaTilknytninger = (client, txid, temaModelList) => go(function* () {
  for (let temaModel of temaModelList) {
    if(!temaModel.withoutTilknytninger) {
      yield recomputeMaterialization(client, txid, schemaModel.tables, schemaModel.materializations[temaModel.tilknytningTable]);
    }
  }
  yield recomputeMaterialization(client, txid, schemaModel.tables, schemaModel.materializations.tilknytninger_mat);
});

const recomputeMaterializedDawa = (client, txid) => go(function* () {
  for (let table of ['adgangsadresser_mat', 'adresser_mat']) {
    const model = schemaModel.materializations[table];
    if (!model) {
      throw new Error('No table model for ' + schemaModel);
    }
    yield client.query(`delete from ${table}; delete from ${table}_changes`);
    yield initializeFromScratch(client, txid, model.view, schemaModel.tables[table]);
  }
  yield recomputeTemaTilknytninger(client, txid, temaModels.modelList);
});

const tilknytningTableNames =
  [...temaModels.modelList.filter(model => !model.withoutTilknytninger).map(model => model.tilknytningTable),
    'jordstykker_adgadr',
    'stedtilknytninger'];

const dar10HistoryTableNames = Object.values(dar10TableModels.historyTableModels).map(model => model.table);
const dar10currentTableTableNames = Object.values(dar10TableModels.currentTableModels).map(model => model.table);
const dawaBaseTableNames = ['vejstykker', 'adgangsadresser',
  'enhedsadresser', 'navngivenvej',
  'vejstykkerpostnumremat', 'vejpunkter', 'navngivenvej_postnummer', 'ejerlav', 'postnumre'];


const orderedTableNames = [...dar10HistoryTableNames,
  ...dar10currentTableTableNames,
  ...dawaBaseTableNames,
  ...tilknytningTableNames];

// no replication of navngivenvej_postnummer and vejpunkter, but an additional replication of stednavntilknytninger
assert(orderedTableNames.length === Object.keys(replikeringDataModel).length + 1);

const orderedTableModels = orderedTableNames.map(tableName => {
  assert(schemaModel.tables[tableName], 'table model for ' + tableName);
  return schemaModel.tables[tableName]
});

const applySequenceNumbersInOrder = (client, txid) =>
  assignSequenceNumbersToDependentTables(client, txid, orderedTableModels);

const makeChangesNonPublic = (client, txid, tableModel) =>
  client.query(`UPDATE ${tableModel.table}_changes SET public=false WHERE txid = $1`, [txid]);

const makeAllChangesNonPublic = (client, txid) => go(function*() {
  for (let tableModel of orderedTableModels) {
    yield makeChangesNonPublic(client, txid, tableModel);
  }
});

module.exports = {
  computeDirty,
  createChangeTable,
  computeInserts,
  computeDeletes,
  computeUpdates,
  computeChanges,
  materialize,
  materializeFromScratch,
  materializeDawa,
  recomputeMaterializedDawa,
  recomputeMaterialization,
  recomputeTemaTilknytninger,
  dropTempDirtyTable,
  applySequenceNumbersInOrder,
  makeAllChangesNonPublic,
  makeChangesNonPublic
};
