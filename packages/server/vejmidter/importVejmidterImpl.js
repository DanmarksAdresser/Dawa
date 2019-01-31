"use strict";

const { go } = require('ts-csp');

const { createVejmidteImporter } = require('../components/importers/vejmidter');
const { EXECUTION_STRATEGY } = require('../components/common');
const { execute } = require('../components/execute');

const importVejmidter = (client, txid, filePath) => go(function*() {
  const importer = createVejmidteImporter({filePath});
  return yield execute(client, txid, [importer], EXECUTION_STRATEGY.preferIncremental, {});
});

module.exports = {
  importVejmidter
};