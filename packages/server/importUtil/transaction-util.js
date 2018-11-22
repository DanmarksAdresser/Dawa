"use strict";

const { withImportTransaction : withTransaction } = require('@dawadk/import-util/src/transaction');
// Generic utility functions for importing data to PostgreSQL
const {orderedTableModels} = require('./materialize-dawa');

const withMigrationTransaction = (client, description, fn) => withTransaction(client, description, [], fn);

const withImportTransaction = (client, description, fn) => withTransaction(client, description,orderedTableModels, fn);


module.exports = {
  withImportTransaction,
  withMigrationTransaction
};
