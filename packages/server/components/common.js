const _ = require('underscore');
const { go } = require('ts-csp');
const tableSchema = require('../psql/tableModel');
const {
  materialize,
  recomputeMaterialization

} = require('@dawadk/import-util/src/materialize');

const EXECUTION_STRATEGY = {
  requireIncremental: {}, // Execute incrementally, fail if not supported
  preferIncremental: {}, // execute incrementally, run non-incremental as non-incremental
  nonIncremental: {}, // run non-incrementally, but do not run unless changed input tables
  nonIncrementalAll: {},// Run non-incrementally, do not rely on dirty-checking
  skipNonIncremental: {}, // run incremental, skip non-incremental
  skip: {} // skip component, used only in overrides
};

const EXECUTION_MODE = {
  incremental: {},
  nonincremental: {},
  skip: {},
  error: {}
};

const getExecutionMode = (strategy, incrementalSupported) => {
  if(strategy === EXECUTION_STRATEGY.skip) {
    return EXECUTION_MODE.skip;
  }
  if(strategy === EXECUTION_STRATEGY.requireIncremental && !incrementalSupported) {
    return EXECUTION_MODE.error;
  }
  if(incrementalSupported && [EXECUTION_STRATEGY.requireIncremental,
      EXECUTION_STRATEGY.preferIncremental,
      EXECUTION_STRATEGY.skipNonIncremental].includes(strategy)) {
    return EXECUTION_MODE.incremental;
  }
  if(strategy === EXECUTION_STRATEGY.skipNonIncremental) {
    return EXECUTION_MODE.skip;
  }
  return EXECUTION_MODE.nonincremental;
};

const fromMaterializations = (id, description, materializations) => {
  const produces = new Set();
  const requires = new Set();
  for (let materialization of materializations) {
    produces.add(materialization.table);
    for (let dependent of materialization.dependents) {
      requires.add(dependent.table);
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
      const hasModifiedDependency = _.some(Array.from(requires), table => changes[table] && changes[table].total > 0);
      if(strategy !== EXECUTION_STRATEGY.nonIncrementalAll && !hasModifiedDependency) {
        return;
      }
      const executionMode = getExecutionMode(strategy, true);
      if(executionMode === EXECUTION_MODE.skip) {
        return;
      }
      for (let materialization of materializations) {
        if(executionMode === EXECUTION_MODE.incremental) {
          yield materialize(client, txid, tableSchema.tables, materialization);
        }
        else {
          yield recomputeMaterialization(client, txid, tableSchema.tables, materialization);
        }
      }
    }),
  }
};

module.exports = {
  EXECUTION_STRATEGY,
  EXECUTION_MODE,
  fromMaterializations,
  getExecutionMode
};