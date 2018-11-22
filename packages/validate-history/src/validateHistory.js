#!/usr/bin/env node
"use strict";

const {go} = require('ts-csp');
const _ = require('underscore');

const {runImporter} = require('@dawadk/common/src/cli/run-importer');
const databasePools = require('@dawadk/common/src/postgres/database-pools');
const { validateHistoryImpl } = require('./validateHistoryImpl');

const optionSpec = {
  pgConnectionUrl: [false, 'URL som anvendes ved forbindelse til databasen', 'string'],
  tableName: [false, 'Inspicer enkelt tabel', 'string'],
  columnName: [false, 'Inspicer enkelt kolonne i tabel', 'string'],
  aggregate: [false, 'Aggreger ændringer', 'boolean', false]
};

runImporter('inspectHistory', optionSpec, _.without(_.keys(optionSpec), 'tableName', 'columnName'), function (args, options) {
  const pool = databasePools.create("pool", {
    connString: options.pgConnectionUrl,
    pooled: false
  });

  return pool.withTransaction('READ_ONLY', client => go(function*() {
    /* eslint no-console: 0 */
    console.log(JSON.stringify(yield validateHistoryImpl(client, options.tableName, options.columnName, options.aggregate), null, 2));
  }));
});
