const { go } = require('ts-csp');
const moment = require('moment');
const {name} = require('./table-diff-protocol');
const materializationViewSql = (historyTableModel, currentTableModel, virkningTsTableName) => {
  const columnNames = currentTableModel.columns.map(name);
  return `DROP VIEW IF EXISTS ${currentTableModel.table}_view  CASCADE; 
    CREATE VIEW ${currentTableModel.table}_view AS (SELECT ${columnNames.join(', ')} 
    FROM ${historyTableModel.table}, (select virkning as current_virkning from ${virkningTsTableName}) virk WHERE current_virkning <@ virkning);`;
};

const getMaterialization = (historyTableModel, currentTableModel) => {
  return {
    table: `${currentTableModel.table}`,
    view: `${currentTableModel.table}_view`,
    dependents: [
      {
        table: `${historyTableModel.table}`,
        columns: ['id'],
        references: ['id']
      }
    ]
  };
};

const getVirkningTime = (client, tsTableName) => go(function*() {
  return (yield client.queryRows(`select virkning from ${tsTableName} as time`))[0].time;
});

const setVirkningTime = (client, tsTableName, newVirkning) => go(function*() {
  const prevVirkning = yield getVirkningTime(client, tsTableName);
  if (moment(prevVirkning).isAfter(moment(newVirkning))) {
    throw new Error("Cannot move back in virkning time");
  }
  yield client.query(`update ${tsTableName} SET virkning = $1, prev_virkning=virkning`, [newVirkning]);
});

const  getNextVirkningTime = (client, txid, tsTableName, tableModels)  =>go(function*() {
  const virkningTimeDb = (yield client.query(`SELECT GREATEST((SELECT virkning from ${tsTableName}), NOW()) as time`)).rows[0].time;
  if (tableModels.length === 0) {
    return virkningTimeDb;
  }
  const registrationTimeSelects = tableModels.map(tableModel =>
    `select max(lower(registrering)) FROM ${tableModel.table}_changes WHERE txid = ${txid}`);
  const selectMaxRegistrationQuery = `SELECT GREATEST((${registrationTimeSelects.join('),(')}))`;
  const virkningTimeChanges = (yield client.queryRows(`${selectMaxRegistrationQuery} as v`))[0].v;
  // We have previously received invalid registration times far in the future.
  // We ignore the registration time of the changeset if the registration time is beyond 2 minutes into the future.
  const virkningTimeChangesValid = virkningTimeChanges &&
    moment(virkningTimeDb).add(2, 'minute').isAfter(moment(virkningTimeChanges));
  const latest = virkningTimeChangesValid ? moment.max(moment(virkningTimeDb), moment(virkningTimeChanges)) :
    moment(virkningTimeDb);
  return latest.toISOString();
});



/**
 * Advance virkning time in database to the time appropriate for the transaction.
 * It is the greatest value of:
 * 1) The current virkning time in db
 * 2) Current db clock time (SELECT NOW())
 * 3) Registration time of the transaction being processed.
 */
const advanceVirkningTime = (client, txid, tsTableName, tableModelsWithNewRows) => go(function*() {
  const newVirkningTime = yield getNextVirkningTime(client, txid, tsTableName, tableModelsWithNewRows);
  yield setVirkningTime(client, tsTableName,newVirkningTime);
  return newVirkningTime;
});

module.exports = {
  materializationViewSql,
  getMaterialization,
  advanceVirkningTime
};