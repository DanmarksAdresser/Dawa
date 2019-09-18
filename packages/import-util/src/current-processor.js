const _ = require('underscore');
const { go } = require('ts-csp');

const tableDiffNg = require('./table-diff');
const materialize = require('./materialize');


const createCurrentProcessor = ({historyTableModel, currentTableModel, materialization, tsTableName}) => {
  const tableModels = _.indexBy([historyTableModel, currentTableModel], 'table');

  const hasChangedEntitiesDueToVirkningTime = (client) => go(function*() {
    const table = historyTableModel.table;
    return (yield client.queryRows(`SELECT count(*) > 0 as has_changed FROM ${table}, 
        (SELECT virkning as current_virkning FROM ${tsTableName}) cv,
        (select prev_virkning from ${tsTableName}) pv
        WHERE (lower(virkning) > prev_virkning AND lower(virkning) <= current_virkning) or 
              (upper(virkning) > prev_virkning AND upper(virkning) <= current_virkning)
            `))[0].has_changed;
  });

  const materializeIncrementally = (client, txid) => go(function* () {
    yield materialize.computeDirty(client, txid, tableModels, materialization);
    yield client.query(`INSERT INTO ${currentTableModel.table}_dirty
    (SELECT id FROM ${historyTableModel.table}, 
        (select prev_virkning from ${tsTableName}) as pv, 
        (select virkning as current_virkning from ${tsTableName}) as
      cv WHERE (prev_virkning <  lower(virkning) and current_virkning >= lower(virkning))
             or (prev_virkning <  upper(virkning) and current_virkning >= upper(virkning))
             EXCEPT (SELECT id from ${currentTableModel.table}_dirty))`);
    yield materialize.computeChanges(client, txid, tableModels, materialization);
    yield tableDiffNg.applyChanges(client, txid, currentTableModel);
    yield materialize.dropTempDirtyTable(client, currentTableModel);
  });

  const initialize = (client, txid) =>
    materialize.recomputeMaterialization(client, txid, tableModels, materialization);


  const execute = (client, txid,  strategy, context) => go(function*() {
    if ((yield client.queryRows(`select * from ${currentTableModel.table} limit 1`)).length > 0) {
      yield initialize(client, txid);
    } else {
      if(context.changes[historyTableModel.table].total > 0 || (yield hasChangedEntitiesDueToVirkningTime(client))) {
        yield materializeIncrementally(client, txid);
      }
    }
  });
  return {
    id: `${currentTableModel.table}`,
    description: `Aktuel-tabel ${currentTableModel.table} afledt af ${historyTableModel.table}`,
    execute,
    requires: [historyTableModel.table],
    produces: [currentTableModel.table]
  }
};

module.exports = {
  createCurrentProcessor
};