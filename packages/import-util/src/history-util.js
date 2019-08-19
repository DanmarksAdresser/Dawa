const { go } = require('ts-csp');

const sqlUtil = require('@dawadk/common/src/postgres/sql-util');

const createHeadTailTempTable = (client, tableName, htsTableName, idColumns, columns, bitemporal) => {
  const selectIds = sqlUtil.selectList(tableName, idColumns.concat('virkning'));
  const selectHead = "(lag(virkning, 1) OVER w) IS NULL OR COALESCE(upper(lag(virkning, 1) OVER w) <> lower(virkning), TRUE) AS head";
  const selectTail = "(lead(virkning, 1) OVER w) IS NULL OR COALESCE(lower(lead(virkning, 1) OVER w) <> upper(virkning), TRUE) AS tail";
  const window = `WINDOW w AS (PARTITION BY ${columns.join(', ')} ORDER BY lower(virkning))`;
  const whereClause = bitemporal ? " WHERE upper(registrering) IS NULL" : "";
  const selectQuery = `SELECT ${selectIds}, ${selectHead}, ${selectTail} FROM ${tableName} ${whereClause} ${window}`;
  const sql = `CREATE TEMP TABLE ${htsTableName} AS (${selectQuery});` +
    ` CREATE INDEX ON ${htsTableName}(${idColumns.join(', ')})`;
  return client.queryp(sql);
};

const mergeValidTime = (client, tableName, targetTableName, idColumns, columns, bitemporal) => go(function*() {
  const htsTableName = tableName + "_hts";
  yield createHeadTailTempTable(client, tableName, htsTableName, idColumns, columns, bitemporal);
  const subselect =
    `SELECT upper(ht2.virkning)
     FROM ${htsTableName} ht2
     WHERE ${sqlUtil.columnsEqualClause('ht', 'ht2', idColumns)}
      AND ht2.tail AND lower(ht2.virkning) >= lower(ht.virkning) ORDER BY ${columns.join(', ')}, lower(virkning) LIMIT 1`
  const select = `SELECT ${sqlUtil.selectList('tab', columns)},
  tstzrange(lower(ht.virkning),
  (${subselect}), '[)') as virkning
  FROM ${htsTableName} ht
  JOIN ${tableName} tab ON ${sqlUtil.columnsEqualClause('ht', 'tab', idColumns)} AND ht.virkning = tab.virkning ${bitemporal ? ' AND upper(tab.registrering) IS NULL' : ''}
  WHERE ht.head`;
  const sql = `CREATE TEMP TABLE ${targetTableName} AS (${select})`;
  yield client.queryp(sql);
  yield client.queryp(`DROP TABLE ${htsTableName}`);
});

module.exports = {
  createHeadTailTempTable,
  mergeValidTime
};