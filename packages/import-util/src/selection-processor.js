const {name} = require('./table-diff-protocol');

const getSelectedTableModel = (sourceTableModel, targetTableName, selectedColumnNames) => {
  return {
    table: targetTableName,
    primaryKey: sourceTableModel.primaryKey,
    columns: sourceTableModel.columns.filter(col => selectedColumnNames.includes(col.name))
  }
};

const getTableSql = (sourceTableModel, targetTableModel) => {
  const selectedColumnNames = targetTableModel.columns.map(name);
  return `DROP TABLE IF EXISTS ${targetTableModel.table};
     CREATE TABLE ${targetTableModel.table} AS (SELECT ${selectedColumnNames.join(',')} FROM ${sourceTableModel.table} WHERE false)`;
};

const getMaterializationSqlView = (sourceTableModel, targetTableModel) => {
  const selectedColumnNames = targetTableModel.columns.map(name);
  return `drop view if exists ${targetTableModel.table}_view;
    CREATE VIEW ${targetTableModel.table}_view AS (SELECT ${selectedColumnNames.join(',')} FROM ${sourceTableModel.table})`;
};

const getMaterialization = (sourceTableModel, targetTableModel) => {
  return {
    table: targetTableModel.table,
    view: `${targetTableModel.table}_view`,
    dependents: [
      {
        table: `${sourceTableModel.table}`,
        columns: targetTableModel.primaryKey
      }
    ]
  }
};

module.exports = {
  getSelectedTableModel,
  getTableSql,
  getMaterializationSqlView,
  getMaterialization
};