const {createMapFn} = require('./xml-parsing');
const grbbrModels = require('./parse-ea-model');
const tableModels= require('./table-models');

module.exports = grbbrModels.map(grbbrModel => {
  return {
    name: grbbrModel.name,
    oisTable: grbbrModel.oisTable,
    oisRegister: 'grbbr',
    tableModel: tableModels.getTableModel(grbbrModel.name, 'bi'),
    mapFn: createMapFn(grbbrModel)
  }
});
