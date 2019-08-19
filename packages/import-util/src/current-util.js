const {name} = require('./table-diff-protocol');
const materializationViewSql = (historyTableModel, currentTableModel, virkningTsTableName) => {
  const columnNames = currentTableModel.columns.map(name);
  return `DROP VIEW IF EXISTS ${currentTableModel.table}_view  CASCADE; 
    CREATE VIEW ${currentTableModel.table}_view AS (SELECT ${columnNames.join(', ')} 
    FROM ${historyTableModel.table}, (select virkning as current_virkning from ${virkningTsTableName}) virk WHERE current_virkning <@ virkning);`;
};

const getMaterialization = (historyTableModel, currentTableModel) => {
  return {
    table: `${currentTableModel.table}`,
    view: `${currentTableModel.table}_view`,
    dependents: [
      {
        table: `${historyTableModel.table}`,
        columns: ['id'],
        references: ['id']
      }
    ]
  };

};
module.exports = {
  materializationViewSql,
  getMaterialization
};