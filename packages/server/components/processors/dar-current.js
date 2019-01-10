const _ = require('underscore');
const { go } = require('ts-csp');

const tableDiffNg = require('@dawadk/import-util/src/table-diff');
const dar10TableModels = require('../../dar10/dar10TableModels');
const materialize = require('@dawadk/import-util/src/materialize');
const tableModels = require('../../psql/tableModel');
const { ALL_DAR_ENTITIES } = require('../../dar10/import-dar-util');

/**
 * Cannot just use materialize, because some dirty rows originate from change in current time.
 */
const materializeCurrent = (client, txid, entityName) => go(function* () {
  const materialization = dar10TableModels.currentTableMaterializations[entityName];
  const tableModel = dar10TableModels.currentTableModels[entityName];
  const rawTableModel = dar10TableModels.rawTableModels[entityName];
  yield materialize.computeDirty(client, txid, tableModels.tables, materialization);
  yield client.query(`INSERT INTO ${tableModel.table}_dirty
    (SELECT id FROM ${rawTableModel.table}, 
        (select prev_virkning from dar1_meta) as pv, 
        (select virkning as current_virkning from dar1_meta) as
      cv WHERE (prev_virkning <  lower(virkning) and current_virkning >= lower(virkning))
             or (prev_virkning <  upper(virkning) and current_virkning >= upper(virkning))
             EXCEPT (SELECT id from ${tableModel.table}_dirty))`);
  yield materialize.computeChanges(client, txid, tableModels.tables, materialization);
  yield tableDiffNg.applyChanges(client, txid, tableModel);
  yield materialize.dropTempDirtyTable(client, tableModel);
});

function getChangedEntitiesDueToVirkningTime(client) {
  const entities = Object.keys(dar10TableModels.rawTableModels);
  return go(function* () {
    const sql = 'SELECT ' + entities.map(entity => {
      const table = dar10TableModels.rawTableModels[entity].table;
      return `(SELECT count(*) FROM ${table}, 
        (SELECT virkning as current_virkning FROM dar1_meta) cv,
        (select prev_virkning from dar1_meta) as pv
        WHERE (lower(virkning) > prev_virkning AND lower(virkning) <= current_virkning) or 
              (upper(virkning) > prev_virkning AND upper(virkning) <= current_virkning)
              ) > 0 as "${entity}"`;
    }).join(',');
    const queryResult = (yield client.queryRows(sql))[0];
    return Object.keys(queryResult).reduce((memo, entityName) => {
      if (queryResult[entityName]) {
        memo.push(entityName);
      }
      return memo;
    }, []);
  });
}

const rematerializeEntity = (client, txid, entityName) => go(function*() {
  const materialization = dar10TableModels.currentTableMaterializations[entityName];
  yield materialize.recomputeMaterialization(client, txid, tableModels.tables, materialization);
});
/**
 * Given updated DAR tables, but the corresponding insert_, update_ and delete_ tables still present,
 * incrementially update the _current tables.
 * @param client
 * @returns {*}
 */
const materializeIncrementally =
  (client, txid, darEntitiesWithNewRows, entitiesWithChangedVirkning) => go(function* () {
    const allChangedEntities = _.union(darEntitiesWithNewRows, entitiesWithChangedVirkning);
    for (let entityName of allChangedEntities) {
      const materialization = dar10TableModels.currentTableMaterializations[entityName];
      if((yield client.queryRows(`select * from ${materialization.table} limit 1`)).length > 0) {
        yield materializeCurrent(client, txid, entityName);
      }
      else {
        yield rematerializeEntity(client, txid, entityName);
      }

    }
  });


module.exports = {
  description: "DAR aktuelle entiteter",
  execute: (client, txid) => go(function*() {
    for (let entityName of ALL_DAR_ENTITIES) {
      yield rematerializeEntity(client, txid, entityName);
    }
  }),
  executeIncrementally: (client, txid) => go(function*() {
    const entitiesChangedDueToVirkningTime = yield getChangedEntitiesDueToVirkningTime(client);
    yield materializeIncrementally(client, txid, ALL_DAR_ENTITIES,entitiesChangedDueToVirkningTime);
  })
};