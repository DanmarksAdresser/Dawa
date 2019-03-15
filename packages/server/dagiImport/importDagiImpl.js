const { go } = require('ts-csp');
const logger = require('@dawadk/common/src/logger').forCategory('dagiImport');

const { createDagiImporter, createSingleTemaImporter } = require('../components/importers/dagi');
const { EXECUTION_STRATEGY } = require('../components/common');
const { execute } = require('../components/execute');
const temaModels = require('./temaModels');

const verifyMaxChanges = (context, temaModel, maxChanges) => {
  // Check at der ikke udført for mange ændringer (indikerer fejl i input)
  const changes = context.changes[temaModel.tilknytningTable].total;
  if(changes > maxChanges) {
    logger.error("Too Many Changes", {
      changes,
      maxChanges,
      tema: temaModel.singular
    });
    throw new Error("Too Many Changes");
  }
};

module.exports = (client, txid, temaNames, featureMappings,
                  dataDir, filePrefix, source, maxChanges) => go(function*() {
  const importer = createDagiImporter({temaNames, dataDir, filePrefix, source, featureMappings});
  const context = yield execute(client, txid, [importer], EXECUTION_STRATEGY.slow);
  for(let tema of temaNames) {

    const temaModel = temaModels.modelMap[tema];
    // Vi gemmer ikke historik på temaer.
    yield client.query(`DELETE FROM ${temaModel.table}_changes`);
    verifyMaxChanges(context, temaModel, maxChanges);
  }
});

module.exports.importSingleTema = (client, txid, temaModel, temaData, maxChanges) => go(function*() {
  const importer = createSingleTemaImporter(temaModel, temaData);
  const context = yield execute(client, txid, [importer], EXECUTION_STRATEGY.slow);
  verifyMaxChanges(context, temaModel, maxChanges);
});