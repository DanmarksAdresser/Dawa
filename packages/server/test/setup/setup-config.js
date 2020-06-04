const Promise = require('bluebird');
const fs = require('fs');
const path = require('path');

Promise.config({
  longStackTraces: true
});

const configHolder = require('@dawadk/common/src/config/holder');
const testConfigSchemas = configHolder.mergeConfigSchemas([
  require('@dawadk/common/src/config/base-schema'),
  require('@dawadk/common/src/config/test-db-schema'),
  require('@dawadk/import-util/conf/schemas/s3-offload-schema'),
  require('@dawadk/import-util/conf/schemas/s3rver-schema'),
  require('../../conf/schemas/server-schema'),
  require('../../conf/schemas/test-schema')]);

const configFiles = [require.resolve('@dawadk/import-util/conf/test/s3-offload.json5'),
  require.resolve('../../conf/test/dawa-server.json5')];

const testConfigFile = path.join(__dirname, '../../../../local-conf/test-conf.json5');
if(fs.existsSync(testConfigFile)) {
  configFiles.push(testConfigFile);
}
if(fs.existsSync(testConfigFile)) {
  // eslint-disable-next-line no-console
  console.log(`loading additional test config from ${testConfigFile}`)
  configFiles.push(testConfigFile);
}
else {
  // eslint-disable-next-line no-console
  console.log(`In order to configure stuff for testing, create the file ${testConfigFile}`)
}
configHolder.initialize(testConfigSchemas, configFiles, {});
