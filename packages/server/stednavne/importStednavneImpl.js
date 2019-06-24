"use strict";

const { go } = require('ts-csp');

const logger = require('@dawadk/common/src/logger').forCategory('importStednavne');
const { EXECUTION_STRATEGY } = require("../components/common");
const { executeRollbackable} = require('../components/execute');
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

const doImport = (client, importer, maxChanges) => go(function*() {
  const context = yield executeRollbackable(client, 'importStednavne', [importer], EXECUTION_STRATEGY.slow);
  if(!context.rollback) {
    verifyChanges(context, maxChanges);
  }
  // This is a workaround for the following:
  // When importing stednavne, the TSV column is derived from the kommune.
  // However, the relation between sted and kommune has not yet been computed.
  // therefore, the TSV will be wrong.
  // We fix this for now by running the importer twice.
  yield executeRollbackable(client, 'importStednavne',[importer], EXECUTION_STRATEGY.fast);
});
const importStednavneFromStream = (client, stream, maxChanges) => go(function*() {
  const importer = createStednavneImporterFromStream({stream});
  yield doImport(client, importer, maxChanges);
});

const importStednavne = (client,  filePath, maxChanges) => go(function*() {
  const importer = createStednavneImporter({filePath});
  yield doImport(client, importer, maxChanges);
});

module.exports = {
  importStednavne,
  importStednavneFromStream
};
