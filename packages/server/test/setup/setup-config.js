const Promise = require('bluebird');
const path = require('path');
const fs = require('fs');

Promise.config({
  longStackTraces: true
});

const configHolder = require('@dawadk/common/src/config/holder');
const testConfigSchemas = configHolder.mergeConfigSchemas([
  require('@dawadk/common/src/config/base-schema'),
  require('@dawadk/common/src/config/test-db-schema'),
  require('@dawadk/import-util/src/config/schemas/s3-offload-import-schema'),
  require('@dawadk/import-util/src/config/schemas/s3rver-schema'),
  require('../../config/server-schema')]);

const configFiles = [require.resolve('@dawadk/import-util/config/test/s3-offload.json5'),
require.resolve('../../server/default-test-config.json5')];
const testConfigFile = path.join(__dirname, '../../../../local-conf/test-conf.json5');
if (fs.existsSync(testConfigFile)) {
  configFiles.push(testConfigFile);
}
configHolder.initialize(testConfigSchemas, configFiles, {});