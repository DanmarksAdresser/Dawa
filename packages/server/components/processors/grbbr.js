const _ = require('underscore');
const {bitemporalTableModels, historyTableModels, currentTableModels, publicCurrentModels, publicHistoryModels, currentMaterializations, publicCurrentMaterializations} = require('../../ois2/model');
const {createCurrentProcessor} = require('@dawadk/import-util/src/current-processor');
const {createHistoryProcessor} = require('@dawadk/import-util/src/history-processor');

const fullGrbbrHistoryProcessors = _.zip(bitemporalTableModels, historyTableModels)
  .map(([bitemporalTableModel, historyTableModel]) =>
    createHistoryProcessor(bitemporalTableModel, historyTableModel));

const fullGrbbrCurrentProcessors = _.zip(historyTableModels, currentTableModels, currentMaterializations)
  .map(([historyTableModel, currentTableModel, materialization]) =>
    createCurrentProcessor({
      historyTableModel,
      currentTableModel,
      materialization,
      tsTableName: 'grbbr_virkning_ts'
    }));

const lightGrbbrHistoryProcessors = _.zip(bitemporalTableModels, publicHistoryModels)
  .map(([bitemporalTableModel, historyTableModel]) =>
    createHistoryProcessor(bitemporalTableModel, historyTableModel));

const lightGrbbrCurrentProcessors = _.zip(publicHistoryModels, publicCurrentModels, publicCurrentMaterializations)
  .map(([historyTableModel, currentTableModel, materialization]) =>
    createCurrentProcessor({
      historyTableModel,
      currentTableModel,
      materialization,
      tsTableName: 'grbbr_virkning_ts'
    }));

module.exports = [
  ...fullGrbbrHistoryProcessors,
  ...fullGrbbrCurrentProcessors,
  ...lightGrbbrHistoryProcessors,
  ...lightGrbbrCurrentProcessors
];