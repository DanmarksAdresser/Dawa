const { go } = require('ts-csp');
const { assert } = require('chai');
const schemaModel = require('../psql/tableModel');
const temaModels = require('../dagiImport/temaModels');
const dar10TableModels = require('../dar10/dar10TableModels');
const replikeringDataModel = require('../apiSpecification/replikering/datamodel');
const {
  materialize,
  recomputeMaterialization,
  makeChangesNonPublic

} = require('@dawadk/import-util/src/materialize');
const { assignSequenceNumbersToDependentTables } = require('@dawadk/import-util/src/table-diff');

const materializeDawa = (client, txid) => go(function* () {
  yield materialize(client, txid, schemaModel.tables, schemaModel.materializations.adgangsadresser);
  yield materialize(client, txid, schemaModel.tables, schemaModel.materializations.adgangsadresser_mat);
  yield materialize(client, txid, schemaModel.tables, schemaModel.materializations.enhedsadresser);
  yield materialize(client, txid, schemaModel.tables, schemaModel.materializations.adresser_mat);
  yield materialize(client, txid, schemaModel.tables, schemaModel.materializations.jordstykker_adgadr);
  yield materialize(client, txid, schemaModel.tables, schemaModel.materializations.stedtilknytninger);
  for (let model of temaModels.modelList) {
    if (!model.withoutTilknytninger) {
      yield materialize(client, txid, schemaModel.tables, schemaModel.materializations[model.tilknytningTable]);
    }
  }
  yield materialize(client, txid, schemaModel.tables, schemaModel.materializations.tilknytninger_mat);
  yield materialize(client, txid, schemaModel.tables, schemaModel.materializations.ikke_brofaste_adresser);
});

const recomputeTemaTilknytninger = (client, txid, temaModelList) => go(function* () {
  for (let temaModel of temaModelList) {
    if (!temaModel.withoutTilknytninger) {
      yield recomputeMaterialization(client, txid, schemaModel.tables, schemaModel.materializations[temaModel.tilknytningTable]);
    }
  }
  yield recomputeMaterialization(client, txid, schemaModel.tables, schemaModel.materializations.tilknytninger_mat);
});

const recomputeMaterializedDawa = (client, txid) => go(function* () {
  for (let table of ['adgangsadresser_mat', 'adresser_mat', 'jordstykker_adgadr', 'stedtilknytninger', 'ikke_brofaste_adresser']) {
    yield recomputeMaterialization(client, txid, schemaModel.tables, schemaModel.materializations[table]);
  }
  yield recomputeTemaTilknytninger(client, txid, temaModels.modelList);
});

const tilknytningTableNames =
  [...temaModels.modelList.filter(model => !model.withoutTilknytninger).map(model => model.tilknytningTable),
    'jordstykker_adgadr',
    'bygningtilknytninger',
    'stedtilknytninger'];

const dar10HistoryTableNames = Object.values(dar10TableModels.historyTableModels).map(model => model.table);
const dar10currentTableTableNames = Object.values(dar10TableModels.currentTableModels).map(model => model.table);
const dawaBaseTableNames = ['vejstykker', 'vejpunkter', 'navngivenvej', 'postnumre', 'jordstykker', 'bygninger', 'ejerlav',
  'adgangsadresser',
  'enhedsadresser',
  'vejstykkerpostnumremat', 'navngivenvej_postnummer'];


const orderedTableNames = [...dar10HistoryTableNames,
  ...dar10currentTableTableNames,
  ...dawaBaseTableNames,
  ...tilknytningTableNames];

// no replication of navngivenvej_postnummer, but an additional replication of stednavntilknytninger
assert(orderedTableNames.length === Object.keys(replikeringDataModel).length);

const orderedTableModels = orderedTableNames.map(tableName => {
  assert(schemaModel.tables[tableName], 'table model for ' + tableName);
  return schemaModel.tables[tableName]
});

const applySequenceNumbersInOrder = (client, txid) =>
  assignSequenceNumbersToDependentTables(client, txid, orderedTableModels);

const makeAllChangesNonPublic = (client, txid) => go(function* () {
  for (let tableModel of orderedTableModels) {
    yield makeChangesNonPublic(client, txid, tableModel);
  }
});

module.exports = {
  recomputeTemaTilknytninger,
  materializeDawa,
  recomputeMaterializedDawa,
  applySequenceNumbersInOrder,
  orderedTableModels,
  makeAllChangesNonPublic
};