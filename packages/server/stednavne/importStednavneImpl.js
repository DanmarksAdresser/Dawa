"use strict";

const { go } = require('ts-csp');

const logger = require('@dawadk/common/src/logger').forCategory('importStednavne');
const { EXECUTION_STRATEGY } = require("../components/common");
const { execute} = require('../components/execute');
const { createStednavneImporter, createStednavneImporterFromStream } = require('../components/importers/stednavne');

const verifyChanges = (context, maxChanges) => {
  const changes = context.changes.stedtilknytninger.total;
  if(changes > maxChanges) {
    logger.error("Too Many Changes", {
      changes,
      maxChanges
    });
    throw new Error("Too Many Changes");
  }
};

const importStednavneFromStream = (client, txid, stream, maxChanges) => go(function*() {
  const importer = createStednavneImporterFromStream({stream});
  const context = yield execute(client, txid, [importer], EXECUTION_STRATEGY.slow);
  verifyChanges(context, maxChanges);
});

const importStednavne = (client,txid,  filePath, maxChanges) => go(function*() {
  const importer = createStednavneImporter({filePath});
  const context = yield execute(client, txid, [importer], EXECUTION_STRATEGY.slow);
  verifyChanges(context, maxChanges);
});

module.exports = {
  importStednavne,
  importStednavneFromStream
};
