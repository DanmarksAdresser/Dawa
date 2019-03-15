const fs = require('fs');
const path = require('path');
const runConfiguredCli = require('@dawadk/common/src/cli/run-configured');
const impl = require('./initialize-databases-impl');
const { mergeConfigSchemas } = require('@dawadk/common/src/config/holder');
const configSchema = mergeConfigSchemas([
  require('@dawadk/common/src/config/test-db-schema'),
  require('@dawadk/import-util/src/config/schemas/s3rver-schema'),
  require('@dawadk/import-util/src/config/schemas/s3-offload-import-schema')
]);
const { withS3rver } = require('@dawadk/import-util/src/start-s3rver');

const configFiles = [require.resolve('@dawadk/import-util/config/test/s3-offload.json5')];
const testConfPath = path.join(__dirname, '../../../local-conf/test-conf.json5');
if(fs.existsSync(testConfPath)) {
  configFiles.push(testConfPath);
}
runConfiguredCli(configSchema, configFiles, (config) => {
 return withS3rver(impl);
});
