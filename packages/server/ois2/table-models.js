const { assert } = require("chai");
const grbbrModels = require('./parse-ea-model');

const toTableModel = (grbbrModel, temporality) => {
  const historyColumns = [{
      name: 'rowkey'
    },
    {
      name: 'virkning'
    }];
  const additionalColumns = {
    current: [],
    history: historyColumns,
    bi: [...historyColumns, {name: 'registrering' }]
  }
  const suffixes = {
    current: '_current',
    history: '_history',
    bi: ''
  };
  const primaryKey = temporality === 'current' ? ['id'] : ['rowkey'];
  const prefix = 'bbr_';
  const grbbrAttrs = grbbrModel.attributes;
  return {
    table: `${prefix}${grbbrModel.name}${suffixes[temporality]}`,
    primaryKey,
    columns: [...additionalColumns[temporality], ...grbbrAttrs.map(attr => ({name: attr.binding.column}))]
  }
};

const createTableModelMap = (grbbrModels, temporality) => grbbrModels.reduce((acc, grbbrModel) => {
  acc[grbbrModel.name] = toTableModel(grbbrModel, temporality);
  return acc;
}, {});
const models = {
  bi: createTableModelMap(grbbrModels, 'bi'),
  current: createTableModelMap(grbbrModels, 'current'),
  history: createTableModelMap(grbbrModels, 'history')
};

const getTableModels = (temporality) => {
  return models[temporality];
};

const getTableModel = (name, temporality) => {
  const result = getTableModels(temporality)[name];
  assert(result, `No table model for ${name}, ${temporality}`)
  return result;
};

const allTableModels = (() => {
  let all = [];
  for(let temporality of ['bi', 'current', 'history']) {
      all = all.concat(Object.values(getTableModels(temporality)));
  }
  return all;
})();

module.exports = {
  getTableModels,
  getTableModel,
  allTableModels
};