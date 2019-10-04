"use strict";

const { go } = require('ts-csp');

const { createVejmidteImporter } = require('../components/importers/vejmidter');
const { EXECUTION_STRATEGY } = require('../components/common');
const { execute } = require('../components/execute');

const importVejmidter = (client, txid, filePath, verify) => go(function*() {
  const importer = createVejmidteImporter({filePath});
  return yield execute(client, txid, [importer], verify ? EXECUTION_STRATEGY.verify : EXECUTION_STRATEGY.slow, {});
});

module.exports = {
  importVejmidter
};