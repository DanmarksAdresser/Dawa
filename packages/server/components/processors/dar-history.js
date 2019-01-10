const _ = require("underscore");
const { go } = require('ts-csp');

const tableDiffNg = require('@dawadk/import-util/src/table-diff');
const dar10TableModels = require('../../dar10/dar10TableModels');
 const { mergeValidTime } = require('../../history/common');
 const { ALL_DAR_ENTITIES } = require('../../dar10/import-dar-util');

const materializeIncrementally = (client, txid, entity) => go(function*() {
  const historyTableModel = dar10TableModels.historyTableModels[entity];
  const historyTableColumnNames = historyTableModel.columns.map(column => column.name);
  const rawTableModel = dar10TableModels.rawTableModels[entity];
  yield client.query(`CREATE TEMP TABLE dirty AS (SELECT DISTINCT id FROM ${rawTableModel.table}_changes WHERE txid = ${txid})`);
  yield client.query(`CREATE TEMP TABLE unmerged AS (SELECT null::integer as rowkey, ${_.without(historyTableColumnNames, 'rowkey').join(', ')}
  FROM ${rawTableModel.table} NATURAL JOIN dirty WHERE upper_inf(registrering))`);
  yield mergeValidTime(client, 'unmerged', 'desired', ['id'], _.without(historyTableColumnNames, 'virkning'));
  yield client.query(`CREATE TEMP TABLE current AS (select * from ${historyTableModel.table} NATURAL JOIN dirty)`);
  yield client.query(`UPDATE desired SET rowkey = current.rowkey FROM current WHERE desired.id = current.id AND lower(desired.virkning) =  lower(current.virkning)`);
  yield client.query(`UPDATE desired SET rowkey = nextval('rowkey_sequence') WHERE rowkey IS NULL`);
  yield tableDiffNg.computeDifferencesView(client, txid, 'desired', 'current', historyTableModel);
  yield client.query('DROP TABLE dirty; DROP TABLE unmerged; DROP TABLE desired; DROP TABLE current');
  yield tableDiffNg.applyChanges(client, txid, historyTableModel);
});

const initialize = (client, txid, entityName) => go(function* () {
    const rawTableModel = dar10TableModels.rawTableModels[entityName];
    const historyTableModel = dar10TableModels.historyTableModels[entityName];
    const historyColumnNames = historyTableModel.columns.map(column => column.name);
    yield client.query(`CREATE TEMP TABLE unmerged AS (
    SELECT null::integer as rowkey, ${_.without(historyColumnNames, 'rowkey')} FROM ${rawTableModel.table} WHERE upper_inf(registrering)); analyze unmerged`);
    yield mergeValidTime(client, 'unmerged', 'merged', ['id'], _.without(historyColumnNames, 'virkning'));
    yield client.query(`UPDATE merged SET rowkey = nextval('rowkey_sequence')`);
    yield client.query(`INSERT INTO ${historyTableModel.table}(${historyColumnNames.join(', ')}) (SELECT ${historyColumnNames.join(', ')} FROM merged)`);
    yield client.query(`DROP TABLE unmerged; DROP TABLE merged;`);
    yield client.query(`ANALYZE ${historyTableModel.table}`);
    yield tableDiffNg.initializeChangeTable(client, txid, historyTableModel);
});

const execute = (client, txid) => go(function*() {
  for (let entityName of ALL_DAR_ENTITIES) {
    const historyTableModel = dar10TableModels.historyTableModels[entityName];
    if((yield client.queryRows(`select * from ${historyTableModel.table} limit 1`)).length > 0) {
      yield materializeIncrementally(client, txid, entityName);
    }
    else {
      yield initialize(client, txid, entityName);
    }
  }
});

module.exports = {
  description: "DAR Historik",
  executeIncrementally: (client, txid) => go(function* () {
    yield execute(client, txid);
  })
};