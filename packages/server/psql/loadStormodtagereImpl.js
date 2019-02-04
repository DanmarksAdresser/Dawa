"use strict";

const {go} = require('ts-csp');
const { createStormodtagerImporter } = require('../components/importers/stormodtagere');
const { execute } = require('../components/execute');
const { EXECUTION_STRATEGY } = require('../components/common');
module.exports = (client, txid, inputFile) => go(function*() {
  const importer = createStormodtagerImporter({filePath: inputFile});

  yield execute(client, txid, [importer], EXECUTION_STRATEGY.quick);
});
