const _ = require('underscore');
const { go } = require('ts-csp');

const tableDiffNg = require('@dawadk/import-util/src/table-diff');
const dar10TableModels = require('../../dar10/dar10TableModels');
const materialize = require('@dawadk/import-util/src/materialize');
const tableModels = require('../../psql/tableModel');
const { ALL_DAR_ENTITIES } = require('../../dar10/import-dar-util');
const { getExecutionMode, EXECUTION_MODE} = require('../common');
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

const hasChangedEntitiesDueToVirkningTime = (client, entityName) => go(function*() {
  const table = dar10TableModels.rawTableModels[entityName].table;
  return (yield client.queryRows(`SELECT count(*) > 0 as has_changed FROM ${table}, 
        (SELECT virkning as current_virkning FROM dar1_meta) cv,
        (select prev_virkning from dar1_meta) pv
        WHERE (lower(virkning) > prev_virkning AND lower(virkning) <= current_virkning) or 
              (upper(virkning) > prev_virkning AND upper(virkning) <= current_virkning)
            `))[0].has_changed;
});

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

module.exports = ALL_DAR_ENTITIES.map(entityName => ({
  id: `DAR-${entityName}-Current`,
  description: `Aktuelle ${entityName}`,
  requires: [`dar1_${entityName}_history`],
  produces: [`dar1_${entityName}_current`],
  execute: (client, txid, strategy, context) => go(function*() {
    const darMetaChanged = context['DAR-meta-changed'];
    if(context.changes[`dar1_${entityName}_history`].total > 0 || (darMetaChanged && hasChangedEntitiesDueToVirkningTime(client, entityName)));
    const executionMode = getExecutionMode(strategy, true);
    if(executionMode === EXECUTION_MODE.skip) {
      return;
    }
    else if(executionMode === EXECUTION_MODE.incremental) {
      yield materializeIncrementally(client, txid, [entityName],[entityName]);
    }
    else {
      yield rematerializeEntity(client, txid, entityName);
    }
  }),
}));
