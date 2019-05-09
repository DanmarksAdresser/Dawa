const path = require('path');
const configHolder = require('@dawadk/common/src/config/holder');
const testConfigSchemas = configHolder.mergeConfigSchemas([
  require('@dawadk/common/src/config/base-schema'),
  require('@dawadk/common/src/config/test-db-schema'),
  require('../../conf/schemas/s3-offload-schema'),
  require('../../conf/schemas/s3rver-schema')]);

const configFiles = [path.join(__dirname, '../../conf/test/s3-offload.json5')];
configHolder.initialize(testConfigSchemas, configFiles, {});
