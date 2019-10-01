const createOisImporter = require('../components/importers/ois');
const {executeRollbackable} = require('../components/execute');
const {EXECUTION_STRATEGY} = require('../components/common');
const importGrbbr = (client, dataDir, verify) => {
  const importer = createOisImporter({dataDir});
  return executeRollbackable(client, 'ois-grbbr', [importer], verify ? EXECUTION_STRATEGY.verify : EXECUTION_STRATEGY.quick);
};

module.exports = importGrbbr;