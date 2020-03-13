"use strict";

const { go } = require('ts-csp');
const { createMatrikelImporter } = require("../components/importers/matrikel");
const { EXECUTION_STRATEGY } = require('../components/common');
const { execute } = require('../components/execute');

const importJordstykkerImpl = (client, txid, srcDir, refresh) => go(function*() {
  const importer = createMatrikelImporter({srcDir,refresh});
  yield execute(client, txid, [importer], EXECUTION_STRATEGY.verify);
});

module.exports = {
  importJordstykkerImpl
};
