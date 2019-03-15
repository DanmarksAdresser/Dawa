const path = require('path');
const runConfigured = require('@dawadk/common/src/cli/run-configured');
const s3rverConfigSchema = require('@dawadk/import-util/src/config/schemas/s3rver-schema');
const s3OffloadConfigSchema = require('@dawadk/import-util/src/config/schemas/s3-offload-import-schema');
const { mergeConfigSchemas } = require('@dawadk/common/src/config/holder');

const schema = mergeConfigSchemas([s3rverConfigSchema, s3OffloadConfigSchema]);

const configFile = path.join(__dirname, '../../../local-conf/test-conf.json5');
const s3OffloadTestConfigFile = require.resolve('@dawadk/import-util/config/test/s3-offload.json5');
const {startS3rver} = require('./start-s3rver');

runConfigured(schema, [configFile, s3OffloadTestConfigFile], startS3rver);