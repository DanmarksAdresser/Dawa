const { assert } = require('chai');
const schemaModel = require('../psql/tableModel');
const temaModels = require('../dagiImport/temaModels');
const dar10TableModels = require('../dar10/dar10TableModels');
const replikeringDataModel = require('../apiSpecification/replikering/datamodel');

const tilknytningTableNames =
  [...temaModels.modelList.filter(model => !model.withoutTilknytninger).map(model => model.tilknytningTable),
    'jordstykker_adgadr',
    'bygningtilknytninger',
    'stedtilknytninger'];

const dar10HistoryTableNames = Object.values(dar10TableModels.historyTableModels).map(model => model.table);
const dar10currentTableTableNames = Object.values(dar10TableModels.currentTableModels).map(model => model.table);
const dawaBaseTableNames = ['vejstykker', 'vejpunkter', 'navngivenvej', 'postnumre', 'jordstykker', 'bygninger', 'ejerlav',
  'hoejder',
  'adgangsadresser',
  'enhedsadresser',
  'vejstykkerpostnumremat', 'navngivenvej_postnummer', 'steder'];


const orderedTableNames = [...dar10HistoryTableNames,
  ...dar10currentTableTableNames,
  ...dawaBaseTableNames,
  ...tilknytningTableNames];

assert(orderedTableNames.length === Object.keys(replikeringDataModel).length);

const orderedTableModels = orderedTableNames.map(tableName => {
  assert(schemaModel.tables[tableName], 'table model for ' + tableName);
  return schemaModel.tables[tableName]
});

module.exports = {
  orderedTableModels
};