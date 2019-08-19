const _ = require("underscore");
const {go} = require('ts-csp');

const tableDiff = require('@dawadk/import-util/src/table-diff');
const {name} = require('@dawadk/import-util/src/table-diff-protocol');
const {mergeValidTime} = require('./history-util');

/**
 * This processor computes a valid time history table based on a bitemporal table.
 * Assumptions:
 *  - transaction time stored in "registrering" column as tstzrange
 *  - valid time stored in "virkning" column as tstzrange
 *  - row id stored in "rowkey" column of integer type
 *  - history table name is the name of the bitemporal table suffixed by "_history"
 * @param client
 * @param txid
 * @param entity
 * @returns {Process}
 */

const materializeIncrementally = (client, txid, bitemporalTableModel, historyTableModel) => go(function* () {
  const historyTableColumnNames = historyTableModel.columns.map(column => column.name);
  yield client.query(`CREATE TEMP TABLE dirty AS (SELECT DISTINCT id FROM ${bitemporalTableModel.table}_changes WHERE txid = ${txid})`);
  yield client.query(`CREATE TEMP TABLE unmerged AS (SELECT null::integer as rowkey, ${_.without(historyTableColumnNames, 'rowkey').join(', ')}
  FROM ${bitemporalTableModel.table} NATURAL JOIN dirty WHERE upper_inf(registrering))`);
  yield mergeValidTime(client, 'unmerged', 'desired', ['id'], _.without(historyTableColumnNames, 'virkning'));
  yield client.query(`CREATE TEMP TABLE current AS (select * from ${historyTableModel.table} NATURAL JOIN dirty)`);
  yield client.query(`UPDATE desired
                      SET rowkey = current.rowkey
                      FROM current
                      WHERE desired.id = current.id
                        AND lower(desired.virkning) = lower(current.virkning)`);
  yield client.query(`UPDATE desired
                      SET rowkey = nextval('rowkey_sequence')
                      WHERE rowkey IS NULL`);
  yield tableDiff.computeDifferencesView(client, txid, 'desired', 'current', historyTableModel);
  yield client.query('DROP TABLE dirty; DROP TABLE unmerged; DROP TABLE desired; DROP TABLE current');
  yield tableDiff.applyChanges(client, txid, historyTableModel);
});

const initialize = (client, txid, bitemporalTableModel, historyTableModel) => go(function* () {
  const historyColumnNames = historyTableModel.columns.map(name);
  yield client.query(`CREATE TEMP TABLE unmerged AS (
    SELECT null::integer as rowkey, ${_.without(historyColumnNames, 'rowkey').join(',')} FROM ${bitemporalTableModel.table} WHERE upper_inf(registrering)); analyze unmerged`);
  yield mergeValidTime(client, 'unmerged', 'merged', ['id'], _.without(historyColumnNames, 'virkning'));
  yield client.query(`UPDATE merged
                      SET rowkey = nextval('rowkey_sequence')`);
  yield client.query(`INSERT INTO ${historyTableModel.table}(${historyColumnNames.join(', ')}) (SELECT ${historyColumnNames.join(', ')} FROM merged)`);
  yield client.query(`DROP TABLE unmerged;
  DROP TABLE merged;`);
  yield client.query(`ANALYZE ${historyTableModel.table}`);
  yield tableDiff.initializeChangeTable(client, txid, historyTableModel);
});


const createHistoryProcessor = (bitemporalTableModel, historyTableModel) => {
  const execute = (client, txid) => go(function*() {
    if ((yield client.queryRows(`select * from ${historyTableModel.table} limit 1`)).length > 0) {
      yield materializeIncrementally(client, txid, bitemporalTableModel, historyTableModel);
    } else {
      yield initialize(client, txid, bitemporalTableModel, historyTableModel);
    }
  });
  return {
    id: `${historyTableModel.table}`,
    description: `Historik-tabel ${historyTableModel.table} afledt af ${bitemporalTableModel.table}`,
    execute,
    requires: [bitemporalTableModel.table],
    produces: [historyTableModel.table]
  }
};

module.exports = {
  createHistoryProcessor
};