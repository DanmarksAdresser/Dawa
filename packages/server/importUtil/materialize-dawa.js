const { assert } = require('chai');
const schemaModel = require('../psql/tableModel');
const temaModels = require('../dagiImport/temaModels');
const dar10TableModels = require('../dar10/dar10TableModels');
const replikeringDataModel = require('../apiSpecification/replikering/datamodel');
const grbbrTableModels = require('../ois2/table-models');

const temaTableNames = temaModels.modelList.map(model => model.table || model.plural);
const tilknytningTableNames =
  [...temaModels.modelList.filter(model => !model.withoutTilknytninger).map(model => model.tilknytningTable),
    'jordstykker_adgadr',
    'bygningtilknytninger',
    'stedtilknytninger'];

const dar10HistoryTableNames = Object.values(dar10TableModels.historyTableModels).map(model => model.table);
const dar10currentTableTableNames = Object.values(dar10TableModels.currentTableModels).map(model => model.table);
const replicatedGrbbrTableModels = grbbrTableModels.allTableModels;
const dawaBaseTableNames = ['vejstykker', 'vejmidter', 'vejpunkter', 'navngivenvej', 'postnumre', 'jordstykker', 'bygninger', 'ejerlav',
  'hoejder',
  'adgangsadresser',
  'enhedsadresser',
  'vejstykkerpostnumremat', 'navngivenvej_postnummer', 'steder', 'stednavne', 'brofasthed', 'ikke_brofaste_adresser',
  'vask_adgangsadresser', 'vask_adresser'];


const orderedTableNames = [...dar10HistoryTableNames,
  ...dar10currentTableTableNames,
  ...replicatedGrbbrTableModels.map(model => model.table),
  ...dawaBaseTableNames,
  ...temaTableNames,
  ...tilknytningTableNames];

assert(orderedTableNames.length === Object.keys(replikeringDataModel).length,
  `there was ${orderedTableNames.length} ordered tables, but ${Object.keys(replikeringDataModel).length}`);

const orderedTableModels = orderedTableNames.map(tableName => {
  assert(schemaModel.tables[tableName], 'table model for ' + tableName);
  return schemaModel.tables[tableName]
});

module.exports = {
  orderedTableModels
};