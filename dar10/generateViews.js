"use strict";

const postgresMapper = require('./postgresMapper');

module.exports = function() {
  const currentViews = [];
  const historyViews = [];
  for(let entityName of Object.keys(postgresMapper.tables)) {
    const tableName = postgresMapper.tables[entityName];
    const columns = postgresMapper.columns[entityName];
    currentViews.push(`CREATE VIEW ${tableName}_current AS SELECT ${columns.join(', ')} FROM ${tableName} WHERE upper(registrering) IS NULL AND now() <@ virkning;`);
    historyViews.push(`CREATE VIEW ${tableName}_history AS SELECT ${columns.join(', ')} FROM ${tableName} WHERE upper(registrering) IS NULL;`);
  }
  return currentViews.join('\n') + '\n' + historyViews.join('\n');
};
