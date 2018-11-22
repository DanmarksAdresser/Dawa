"use strict";

/**
 * Given a table alias and an array of columns,
 * return a SQL select list as a string
 */
function selectList(alias, columns) {
  if(!alias) {
    return columns.join(', ');
  }
  return columns.map(function(column) {
    return alias + '.' + column;
  }).join(', ');
}


function columnsDistinctClause(alias1, alias2, columns, distinctClauses) {
  distinctClauses = distinctClauses || {};
  const clauses = columns.map(column =>
    distinctClauses[column] ?
      distinctClauses[column](`${alias1}.${column}`, `${alias2}.${column}`) :
      `${alias1}.${column} IS DISTINCT FROM ${alias2}.${column}`);
  return '(' + clauses.join(' OR ') + ')';
}

function columnsEqualClause(alias1, alias2, columns) {
  const clauses = columns.map(column => `${alias1}.${column} = ${alias2}.${column}`);
  return '(' + clauses.join(' AND ') + ')';
}

function columnsNotDistinctClause(alias1, alias2, columns) {
  const clauses = columns.map(
    column => `${alias1}.${column} IS NOT DISTINCT FROM ${alias2}.${column}`);
  return '(' + clauses.join(' AND ') + ')';
}

module.exports = {
  selectList,
  columnsDistinctClause,
  columnsEqualClause,
  columnsNotDistinctClause
};