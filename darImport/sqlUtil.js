"use strict";

var format = require('string-format');

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


function columnsDistinctClause(alias1, alias2, columns) {
  var clauses = columns.map(function(column) {
    return format('{alias1}.{column} IS DISTINCT FROM {alias2}.{column}',
      {
        alias1: alias1,
        alias2: alias2,
        column: column
      });
  });
  return '(' + clauses.join(' OR ') + ')';
}

function columnsEqualClause(alias1, alias2, columns) {
  var clauses = columns.map(function(column) {
    return format('{alias1}.{column} = {alias2}.{column}',
      {
        alias1: alias1,
        alias2: alias2,
        column: column
      });
  });
  return '(' + clauses.join(' AND ') + ')';
}

function columnsNotDistinctClause(alias1, alias2, columns) {
  var clauses = columns.map(function(column) {
    return format('{alias1}.{column} IS NOT DISTINCT FROM {alias2}.{column}',
      {
        alias1: alias1,
        alias2: alias2,
        column: column
      });
  });
  return '(' + clauses.join(' AND ') + ')';
}

exports.selectList = selectList;
exports.columnsDistinctClause = columnsDistinctClause;
exports.columnsEqualClause = columnsEqualClause;
exports.columnsNotDistinctClause = columnsNotDistinctClause;
