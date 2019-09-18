const { assert } = require('chai');
const tableModels = require('../../ois2/table-models');
const grbbrModels = require('../../ois2/parse-ea-model');
const materializations = require('../../ois2/materializations');
const {createCurrentProcessor} = require('@dawadk/import-util/src/current-processor');
const {createHistoryProcessor} = require('@dawadk/import-util/src/history-processor');

module.exports =  grbbrModels.reduce((acc, grbbrModel) => {
  const bitemporalTableModel = tableModels.getTableModel(grbbrModel.name, 'bi');
  const historyTableModel = tableModels.getTableModel(grbbrModel.name, 'history');
  const currentTableModel = tableModels.getTableModel(grbbrModel.name, 'current');
  assert(bitemporalTableModel);
  assert(historyTableModel);
  assert(currentTableModel);
  const materialization = materializations.allMaterializations.find(mat => mat.table === currentTableModel.table);
  acc.push(createHistoryProcessor(bitemporalTableModel, historyTableModel));
  acc.push(createCurrentProcessor({historyTableModel, currentTableModel, materialization, tsTableName: 'grbbr_virkning_ts'}));
  return acc;
}, []);