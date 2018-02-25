"use strict";

const dar10TableModels = require('./dar10TableModels');

module.exports = function() {
  const currentViews = [];
  for(let entityName of Object.keys(dar10TableModels.currentTableModels)) {
    const currentTableModel = dar10TableModels.currentTableModels[entityName];
    const historyTable = dar10TableModels.historyTableModels[entityName].table;
    const columnNames = currentTableModel.columns.map(column => column.name);
    currentViews.push(`CREATE VIEW ${currentTableModel.table}_view AS SELECT ${columnNames.join(', ')} FROM ${historyTable} WHERE dar1_current_time() <@ virkning;`);
  }
  return currentViews.join('\n');
};
