"use strict";

const q = require('q');
const _ = require('underscore');

const tablediff = require('../importUtil/tablediff');
const sqlUtil = require('../darImport/sqlUtil');


const columnsDistinctClause = sqlUtil.columnsDistinctClause;
const columnsEqualClause = sqlUtil.columnsEqualClause;
const selectList = sqlUtil.selectList;

const idColumns = ['rowkey'];
/**
 * Given srcTable and dstTable, insert into a new temporary table upTable the set of rows
 * to be updated in dstTable in order to make srcTable and dstTable equal.
 */
function computeUpdates(client, srcTable, dstTable, upTable, allColumnNames, srcEventId) {
  // registrering kolonnen er speciel. Vi skal ikke ændre registreringslut tilbage til null hvis
  // event ID tilknyttet ændringen er senere end udtrækkets event ID.
  const regularColumns = _.without(allColumnNames, 'registrering');
  const shouldOverwriteUpperRegistrering = `(${dstTable}.eventopdater IS NOT NULL AND ${dstTable}.eventopdater <= ${srcEventId})`;
  const upperRegistrering = `(CASE WHEN ${shouldOverwriteUpperRegistrering} THEN upper(${srcTable}.registrering) ELSE upper(${dstTable}.registrering) END)`;
  const registreringColumnSelect =
    `tstzrange(lower(${srcTable}.registrering), ${upperRegistrering}, '[)') as registrering`;
  return client.queryp(`CREATE TEMP TABLE ${upTable} AS SELECT ${selectList(srcTable, regularColumns)}, ${registreringColumnSelect}
       FROM ${srcTable}
       JOIN ${dstTable} ON ${srcTable}.rowkey = ${dstTable}.rowkey
       WHERE ${columnsDistinctClause(srcTable, dstTable, regularColumns)} OR (${shouldOverwriteUpperRegistrering} AND upper(${srcTable}.registrering) IS DISTINCT FROM upper(${dstTable}.registrering))`);
}

function computeDeletes(client, srcTable, dstTable, delTable, srcEventId) {
  /**
   * Given srcTable and dstTable, insert into a new, temporary table delTable, the
   * set of rows to be deleted in dstTable in order to make srcTable and dstTable equal.
   * The created table delTable only contains the primary key columns.
   */
  const selectIdColumns = selectList(dstTable, idColumns);
  const idEqualsClause = columnsEqualClause(srcTable, dstTable, idColumns);
  return client.queryp(
    `CREATE TEMP TABLE ${delTable} AS SELECT ${selectIdColumns} FROM ${dstTable}
     WHERE NOT EXISTS(SELECT * FROM ${srcTable} WHERE ${idEqualsClause}) AND
     (${dstTable}.eventopret IS NULL OR ${dstTable}.eventopret <= ${srcEventId})`);

}

exports.computeDifferences = function (client, srcTable, dstTable, allColumnNames, srcEventId) {
  return q.async(function*() {
    yield tablediff.computeInserts(client, srcTable, dstTable, `insert_${dstTable}`, idColumns);
    yield computeUpdates(client, srcTable, dstTable, `update_${dstTable}`, allColumnNames, srcEventId);
    yield computeDeletes(client, srcTable, dstTable, `delete_${dstTable}`, idColumns);
  })();
};

exports.logChanges = function(client, entityName, table) {
  return q.async(function*() {
    yield client.queryp(`INSERT INTO dar1_changelog(tx_id, entity, operation, rowkey) (SELECT dar1_current_tx(), '${entityName}', 'insert', rowkey FROM insert_${table})`);
    yield client.queryp(`INSERT INTO dar1_changelog(tx_id, entity, operation, rowkey) (SELECT dar1_current_tx(), '${entityName}', 'update', rowkey FROM update_${table})`);
    yield client.queryp(`INSERT INTO dar1_changelog(tx_id, entity, operation, rowkey) (SELECT dar1_current_tx(), '${entityName}', 'delete', rowkey FROM delete_${table})`);
  })();
};

exports.applyChanges = function(client, table, allColumnNames) {
  return tablediff.applyChanges(client, table, table, idColumns, allColumnNames, _.difference(allColumnNames, idColumns));
};
