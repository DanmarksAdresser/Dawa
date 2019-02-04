"use strict";

const { go } = require('ts-csp');

const logger = require('@dawadk/common/src/logger').forCategory('importBygninger');
const { createBygningImporter } = require('../components/importers/bygninger');
const { EXECUTION_STRATEGY } = require('../components/common');
const { execute } = require('../components/execute');

const importBygninger = (client,txid,  filePath, maxChanges) => go(function*() {
  const importer = createBygningImporter({filePath});
  const context = yield execute(client, txid, [importer], EXECUTION_STRATEGY.slow);
  const changes = context.changes.bygninger.total;
  if(changes > maxChanges) {
    logger.error("Too Many Changes", {
      changes,
      maxChanges
    });
    throw new Error("Too Many Changes");
  }
});

module.exports = {
  importBygninger
};
