"use strict";

const postgresMapper = require('./postgresMapper');

module.exports = function() {
  const currentViews = [];
  const historyViews = [];
  for(let entityName of Object.keys(postgresMapper.tables)) {
    const tableName = postgresMapper.tables[entityName];
    const columns = postgresMapper.columns[entityName];
    historyViews.push(`DROP VIEW IF EXISTS ${tableName}_history CASCADE;`);
    historyViews.push(`CREATE VIEW ${tableName}_history AS SELECT ${columns.join(', ')} FROM ${tableName} WHERE upper_inf(registrering);`);
    currentViews.push(`DROP VIEW IF EXISTS ${tableName}_current_view CASCADE;`);
    currentViews.push(`CREATE VIEW ${tableName}_current_view AS SELECT ${columns.join(', ')} FROM ${tableName}_history WHERE dar1_current_time() <@ virkning;`);
  }
  return historyViews.join('\n') + '\n' + currentViews.join('\n');
};
