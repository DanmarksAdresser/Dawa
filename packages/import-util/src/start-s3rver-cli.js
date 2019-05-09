const runConfigured = require('@dawadk/common/src/cli/run-configured');
const s3rverConfigSchema = require('../conf/schemas/s3rver-schema');
const s3OffloadConfigSchema = require('../conf/schemas/s3-offload-schema');
const { mergeConfigSchemas } = require('@dawadk/common/src/config/holder');

const schema = mergeConfigSchemas([s3rverConfigSchema, s3OffloadConfigSchema]);

const s3OffloadTestConfigFile = require.resolve('../conf/test/s3-offload.json5');
const {startS3rver} = require('./start-s3rver');

runConfigured(schema, [s3OffloadTestConfigFile], startS3rver);