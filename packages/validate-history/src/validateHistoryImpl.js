const { go } = require('ts-csp');

const {columnsEqualClause} = require('@dawadk/common/src/postgres/sql-util');
const { columnsDistinctClause } = require('@dawadk/import-util/src/table-model-util');
const tableSchema = require('@dawadk/server/psql/tableModel');

const validateHistoryTable = (client, tableModel) => go(function* () {
  const tableName = tableModel.table;
  const report = {};
  const subselect =
    `SELECT *, row_number()
  OVER (PARTITION BY ${tableModel.primaryKey.join(', ')}
    ORDER BY txid desc nulls last, changeid desc NULLS LAST) as row_num
FROM ${tableName}_changes`;
  const currentQuery = `
  select ${tableModel.columns.map(col => col.name).join(',')}
  FROM (${subselect}) t
  WHERE row_num=1 and operation <> 'delete'`;

  const invalidCurrentCountQuery = `
  WITH c AS (${currentQuery})
  SELECT COUNT(*)::integer as invalid_count
   FROM c FULL JOIN ${tableModel.table} t
   ON ${columnsEqualClause('c', 't', tableModel.primaryKey)}
   WHERE ${columnsDistinctClause('c', 't', tableModel.columns)}`;
  report.invalidCurrentCount = (yield client.queryRows(invalidCurrentCountQuery))[0].invalid_count;

  const invalidInsertsQuery =`
  select c1.txid, count(*)::integer as invalid_count
  FROM ${tableModel.table}_changes c1
  LEFT JOIN LATERAL (SELECT * from ${tableModel.table}_changes c2
  where ${columnsEqualClause('c1', 'c2', tableModel.primaryKey)} 
  and (c2.txid < c1.txid or (c1.txid = c2.txid and (c2.changeid is null and c1.changeid is not null) or (c2.changeid < c1.changeid)))
  order by txid desc nulls last, changeid desc nulls last
  limit 1) c2
  ON true
  where c1.operation = 'insert' and c2.operation <> 'delete'
  group by c1.txid`;
  report.invalidInserts = (yield client.queryRows(invalidInsertsQuery));
  const invalidUpdatesQuery =`
  select c1.txid, count(*)::integer as invalid_count
  FROM ${tableModel.table}_changes c1
  LEFT JOIN LATERAL (SELECT * from ${tableModel.table}_changes c2
  where ${columnsEqualClause('c1', 'c2', tableModel.primaryKey)} 
  and (c2.txid < c1.txid or (c1.txid = c2.txid and (c2.changeid is null and c1.changeid is not null) or (c2.changeid < c1.changeid)))
  order by txid desc nulls last, changeid desc nulls last
  limit 1) c2
  ON true
  where c1.operation = 'update' and (c2.operation is null or c2.operation = 'delete')
  group by c1.txid`;
  report.invalidUpdates = (yield client.queryRows(invalidUpdatesQuery));
  const invalidDeletesQuery =`
  select c1.txid, count(*)::integer as invalid_count
  FROM ${tableModel.table}_changes c1
  LEFT JOIN LATERAL (SELECT * from ${tableModel.table}_changes c2
  where ${columnsEqualClause('c1', 'c2', tableModel.primaryKey)} 
  and (c2.txid < c1.txid or (c1.txid = c2.txid and (c2.changeid is null and c1.changeid is not null) or (c2.changeid < c1.changeid)))
  order by txid desc nulls last, changeid desc nulls last
  limit 1) c2
  ON true
  where c1.operation = 'delete' and(c2.operation is null or c2.operation = 'delete')
  group by c1.txid`;
  report.invalidDeletes = (yield client.queryRows(invalidDeletesQuery));
  const invalidDuplicatesSubquery = `
  select txid, changeid, ${tableModel.primaryKey.join(',')}, count(*)
  from ${tableModel.table}_changes group by txid,changeid, ${tableModel.primaryKey.join(',')} having count(*) > 1`;
  report.invalidDuplicates = (yield client.queryRows(`
  select txid,count(*)::integer as invalid_count from (${invalidDuplicatesSubquery}) t group by txid order by txid`));
  return report;
});

const validateHistoryImpl = (client, tableName, columnName, aggregate) => go(function*() {
  const tableModels = tableName ? [tableSchema.tables[tableName]] : Object.values(tableSchema.tables);
  const report = {};
  for(let tableModel of tableModels) {
    const existRows = yield client.queryRows(`SELECT (EXISTS (
   SELECT 1 FROM information_schema.tables WHERE table_name = '${tableModel.table.toLowerCase()}_changes')) as exist`);
    const exists = existRows[0].exist;
    if(exists) {
      report[tableModel.table] = yield validateHistoryTable(client, tableModel);
    }
  }
  return report;
});

module.exports = {
  validateHistoryTable,
  validateHistoryImpl
};