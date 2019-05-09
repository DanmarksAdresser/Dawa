const runConfiguredCli = require('@dawadk/common/src/cli/run-configured');
const impl = require('./initialize-databases-impl');
const {mergeConfigSchemas} = require('@dawadk/common/src/config/holder');
const configSchema = mergeConfigSchemas([
  require('@dawadk/common/src/config/test-db-schema'),
  require('@dawadk/import-util/conf/schemas/s3-offload-schema')
]);
const configHolder = require('@dawadk/common/src/config/holder');
const logger = require('@dawadk/common/src/logger').forCategory('initialize-databases');

const configFiles = [require.resolve('@dawadk/import-util/conf/test/s3-offload.json5')];
runConfiguredCli(configSchema, configFiles, (config) => {
  logger.info(`Configuration:\n${configHolder.documentConfigured(configSchema, config)}`);
  return impl();
});
