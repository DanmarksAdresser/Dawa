"use strict";

const { go } = require('ts-csp');

const schemaModel = require('../psql/tableModel');
const { columnsEqualClause } = require('../darImport/sqlUtil');
const logger = require('../logger').forCategory('inspect');

const inspectInsertOrUpdate = (client, txid, tableModel, operation) => go(function*() {
  const selectList = tableModel.columns.map(column => `${column.name}::text`).join(',');
  const result =  yield client.queryRows(`select ${selectList} from ${tableModel.table}_changes
  WHERE txid = $1 and operation = $2 limit 100`, [txid, operation]);
  return result.map(row => {
    const key = tableModel.primaryKey.reduce((memo, keyName) => {
      memo[keyName] = row[keyName];
      return memo;
    }, {});
    return {key, data: row}
  });
});

const inspectUpdates = (client, txid, tableModel) => go(function*() {
  const beforeSelectList = tableModel.columns.map(column => `c2.${column.name}::text as ${column.name}_before`).join(',');
  const afterSelectList = tableModel.columns.map(column => `c1.${column.name}::text as ${column.name}_after`).join(',');
  const sql = `select ${beforeSelectList}, ${afterSelectList} from ${tableModel.table}_changes c1
left join lateral (
  select * from ${tableModel.table}_changes c2
  where c2.txid < ${txid} and ${columnsEqualClause('c1', 'c2', tableModel.primaryKey)}
  order by txid desc, changeid desc
  limit 1) c2 on true
where c1.txid = ${txid} and c1.operation = 'update' limit 100`;
  const rows = yield client.queryRows(sql);
  return rows.map(row => {
    const key = tableModel.primaryKey.reduce((memo, keyName) => {
      memo[keyName] = row[`${keyName}_after`];
      return memo;
    }, {});
    const mapRowToChanges = row => {
      return tableModel.columns.reduce((memo, column) => {
        const before = row[`${column.name}_before`];
        const after = row[`${column.name}_after`];
        if( before !== after) {
          memo.push({column: column.name, before, after});
        }
        return memo;
      }, []);
    };
    return rows.map(row => {
      return {key, changes: mapRowToChanges(row)};
    });
  });
});

const inspectAggregated = (client, txid, tableModel) => go(function*() {
  logger.info('inspecting ' + tableModel.table);
  const clauses = tableModel.columns.map(column => {
    const beforeCol = `c2.${column.name}`;
    const afterCol = `c1.${column.name}`;
    const distinctClause = column.distinctClause ? column.distinctClause(beforeCol, afterCol) : `${beforeCol} is distinct from ${afterCol}`;
    return `count(case when ${distinctClause} then 1 else null end)::integer as ${column.name}`;
  });
  const updatesSql = `SELECT ${clauses.join(',')}, count(*)::integer as total FROM ${tableModel.table}_changes c1
  LEFT JOIN LATERAL (
  select * from ${tableModel.table}_changes c2
  where c2.txid < $1 and ${columnsEqualClause('c1', 'c2', tableModel.primaryKey)}
  order by txid desc, changeid desc
  limit 1) c2 on true
where c1.txid = $1 and c1.operation = 'update'`;
  const updateResult = (yield client.queryRows(updatesSql, [txid]))[0];
  const insertResult = (yield client.queryRows(`select count(*)::integer as insert_count FROM ${tableModel.table}_changes where txid = $1 and operation = 'insert'`, [txid]))[0];
  const deleteResult = (yield client.queryRows(`select count(*)::integer as delete_count FROM ${tableModel.table}_changes where txid = $1 and operation = 'delete'`, [txid]))[0];
  const updateCount = updateResult.total;
  delete updateResult.total;
  for(let col of Object.keys(updateResult)) {
    if(updateResult[col] === 0) {
      delete updateResult[col];
    }
  }
  const result = {
    inserts: insertResult.insert_count,
    updates: updateCount,
    deletes: deleteResult.delete_count,
    columnsChanged: updateResult
  };
  if(result.updates === 0) {
    delete result.columnsChanged;
  }
  if(result.inserts === 0 && result.updates === 0 && result.deletes === 0) {
    return null;
  }
  else {
    return result;
  }
});

const inspectNonAggregated = (client, txid, tableModel) => go(function*() {
  const result = {
    inserts: yield inspectInsertOrUpdate(client, txid, tableModel, 'insert'),
    updates: yield inspectUpdates(client, txid, tableModel),
    deletes: yield inspectInsertOrUpdate(client, txid, tableModel, 'delete')
  };
  if(result.inserts.length === 0 && result.updates.length === 0 && result.deletes.length === 0) {
    return null;
  }
  else {
    return result;
  }
});

module.exports = (client, txid, aggregate) =>go(function*() {
  const result = {};
  for(let tableModel of Object.values(schemaModel.tables)) {
    const existRows = yield client.queryRows(`SELECT (EXISTS (
   SELECT 1 FROM information_schema.tables WHERE table_name = '${tableModel.table}_changes')) as exist`);
    const exists = existRows[0].exist;
    if(exists) {
      const tableResult = aggregate ? yield inspectAggregated(client, txid, tableModel) : yield inspectNonAggregated(client, txid, tableModel);
      if(tableResult) {
        result[tableModel.table] = tableResult;
      }
    }
  }
  return result;
});