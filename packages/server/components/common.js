const _ = require('underscore');
const {go} = require('ts-csp');
const tableSchema = require('../psql/tableModel');
const {
  materialize,
  recomputeMaterialization

} = require('@dawadk/import-util/src/materialize');

const EXECUTION_STRATEGY = {
  quick: 'QUICK', // Execute all in scope incrementally, skip non-incremental dependencies
  slow: 'SLOW', // Prefer incremental, recompute non-incremental in scope
  verify: 'VERIFY', // Recompute all in scope
};

const EXECUTION_MODE = {
  incremental: {},
  nonincremental: {},
  skip: {}
};

const fromMaterializations = (id, description, materializations) => {
  const produces = new Set();
  const requires = new Set();
  for (let materialization of materializations) {
    produces.add(materialization.table);
    for (let dependent of materialization.dependents) {
      requires.add(dependent.table);
    }
    for (let dependentTable of materialization.nonIncrementalDependents || []) {
      requires.add(dependentTable);
    }
  }
  return {
    id,
    description,
    type: 'processor',
    produces: Array.from(produces),
    requires: Array.from(requires),
    execute: (client, txid, strategy, context) => go(function* () {
      const changes = context.changes;
      for (let materialization of materializations) {
        const materializationRequires = materialization.dependents.map(dependent => dependent.table);
        const hasNonincrementalDependency = (materialization.nonIncrementalDependents || []).length > 0;
        const hasModifiedDependency = _.some(materializationRequires, table => changes[table] && changes[table].total > 0);
        if (strategy === EXECUTION_STRATEGY.quick) {
          if (hasModifiedDependency && !hasNonincrementalDependency) {
            yield materialize(client, txid, tableSchema.tables, materialization);
          }
          else {
            return;
          }
        }
        else if (strategy === EXECUTION_STRATEGY.slow) {
          if (hasNonincrementalDependency) {
            yield recomputeMaterialization(client, txid, tableSchema.tables, materialization);
          }
          else {
            yield materialize(client, txid, tableSchema.tables, materialization);
          }
        }
        else {// EXECUTION_STRATEGY.verify
          yield recomputeMaterialization(client, txid, tableSchema.tables, materialization);
        }
      }
    }),
  }
};

module.exports = {
  EXECUTION_STRATEGY,
  EXECUTION_MODE,
  fromMaterializations
};