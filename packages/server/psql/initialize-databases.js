const runConfiguredCli = require('@dawadk/common/src/cli/run-configured');
const {mergeConfigSchemas} = require('@dawadk/common/src/config/holder');
const configSchema = mergeConfigSchemas([
  require('@dawadk/common/src/config/test-db-schema'),
  require('@dawadk/import-util/conf/schemas/s3-offload-schema')
]);
const configHolder = require('@dawadk/common/src/config/holder');
const logger = require('@dawadk/common/src/logger').forCategory('initialize-databases');
const fs = require('fs');
const path = require('path');

const configFiles = [require.resolve('@dawadk/import-util/conf/test/s3-offload.json5'), require.resolve('../conf/test/initialize-databases.json5')];
const testConfigFile = path.join(__dirname, '../../../local-conf/test-conf.json5');
if(fs.existsSync(testConfigFile)) {
  logger.info(`loading additional test config from ${testConfigFile}`)
  configFiles.push(testConfigFile);
}
else {
  logger.info(`In order to configure stuff for testing, create the file ${testConfigFile}`)
}

runConfiguredCli(configSchema, configFiles, (config) => {
  logger.info(`Configuration:\n${configHolder.documentConfigured(configSchema, config)}`);
  const impl = require('./initialize-databases-impl');
  return impl();
});
