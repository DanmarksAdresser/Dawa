const {getTableModels} = require('./table-models');

const {
  getMaterialization,
  materializationViewSql
} = require('@dawadk/import-util/src/current-util');

const getMaterializations = () => {
  const currentTableModels = getTableModels('current');
  const historyTableModels = getTableModels('history');
  return Object.keys(currentTableModels).map(name => {
    const historyTableModel = historyTableModels[name];
    const currentTableModel = currentTableModels[name];
    return getMaterialization(historyTableModel, currentTableModel);
  });
};

const getViewSql = () => {
  const currentTableModels = getTableModels( 'current');
  const historyTableModels = getTableModels('history');
  return Object.keys(currentTableModels).map(name => {
    const historyTableModel = historyTableModels[name];
    const currentTableModel = currentTableModels[name];
    return materializationViewSql(historyTableModel, currentTableModel, 'grbbr_virkning_ts');
  }).join(';\n');
};

const viewSql = `${getViewSql(true)};\n${getViewSql()}`;
const allMaterializations = getMaterializations();

module.exports = {
  viewSql,
  allMaterializations
};