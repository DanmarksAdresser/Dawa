"use strict";

const { withImportTransaction : withTransaction } = require('@dawadk/import-util/src/transaction');
// Generic utility functions for importing data to PostgreSQL
const {orderedTableModels} = require('./materialize-dawa');

const withMigrationTransaction = (client, description, fn) => withTransaction(client, description, [], fn);

const withImportTransaction = (client, description, fn) => withTransaction(client, description,orderedTableModels, fn);

const importWithoutEvents = (client, description, tablesWithoutEvents, fn ) => {
  const tableModels = orderedTableModels.filter(tableModel => !tablesWithoutEvents.includes(tableModel.table));
  return withTransaction(client, description, tableModels, fn);
};

module.exports = {
  withImportTransaction,
  withMigrationTransaction,
  importWithoutEvents
};
