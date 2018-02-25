"use strict";

const spec = require('./spec');

const schemas = spec.schemas;
const dar10TableModels = require('./dar10TableModels');
const {getChangeTableSql} = require('../importUtil/tableDiffNg');


const getColumnSql = columns => columns.map(column => {
  let sql = `${column.name} ${column.sqlType}`;
  if (!column.nullable) {
    sql += ' NOT NULL';
  }
  return sql;
});

const getTableSql = (tableModel) => {
  const columnSql = getColumnSql(tableModel.columns);
  const primaryKeySql = `PRIMARY KEY(${tableModel.primaryKey.join(', ')})`;
  return `DROP TABLE IF EXISTS ${tableModel.table} CASCADE;
  CREATE TABLE ${tableModel.table}(
  ${columnSql.join(',\n')},
  ${primaryKeySql}
  );`
};

const getEventIndexSql = tableModel => `CREATE INDEX ON ${tableModel.table}(GREATEST(eventopret, eventopdater));`;
const getDomainKeyIndex = tableModel => `CREATE INDEX ON ${tableModel.table}(id);`;
const getVirkningIndices = tableModel => `CREATE INDEX ON ${tableModel.table}(lower(virkning)); CREATE INDEX ON ${tableModel.table}(upper(virkning));`
const getAdditionalCurrentIndices = entityName => {
  const indicesSpec = spec.sqlIndices[entityName] || [];
  return indicesSpec.map(indexSpec => `CREATE INDEX ON dar1_${entityName}_current(${indexSpec.join(',')});`).join('\n')
};
const entityNames = Object.keys(schemas);

const ddlStatements = entityNames.map(entityName => {
  const rawTableModel = dar10TableModels.rawTableModels[entityName];
  const rawTableSql =
    `${getTableSql(rawTableModel)};
  ${getDomainKeyIndex(rawTableModel)};
  ${getEventIndexSql(rawTableModel)};
  ${getChangeTableSql(rawTableModel)};`;

  const historyTableModel = dar10TableModels.historyTableModels[entityName];
  const historyTableSql =
    `${getTableSql(historyTableModel)};
    ${getDomainKeyIndex(historyTableModel)};
    ${getVirkningIndices(historyTableModel)};
    ${getChangeTableSql(historyTableModel)};
    `;

  const currentTableModel = dar10TableModels.currentTableModels[entityName];
  const currentTableSql =
    `${getTableSql(currentTableModel)};
    ${getDomainKeyIndex(currentTableModel)};
    ${getAdditionalCurrentIndices(entityName)};
    ${getChangeTableSql(currentTableModel)};`;

  return `${rawTableSql}
  ${historyTableSql}
  ${currentTableSql}`;
});

module.exports = ddlStatements.join('\n');