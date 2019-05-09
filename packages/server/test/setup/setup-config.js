const Promise = require('bluebird');

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
configHolder.initialize(testConfigSchemas, configFiles, {});
