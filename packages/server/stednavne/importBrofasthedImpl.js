const { go } = require('ts-csp');

const { createBrofasthedImporter } = require('../components/importers/brofasthed');
const { EXECUTION_STRATEGY } = require("../components/common");
const { execute } = require("../components/execute");
module.exports = (client, txid, filePath) => go(function*() {
  const importer = createBrofasthedImporter({filePath});
  yield execute(client, txid, [importer], EXECUTION_STRATEGY.slow);
});
