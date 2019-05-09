const S3Util = require('aws-sdk/clients/s3');

const configHolder = require('@dawadk/common/src/config/holder');
const logger = require('@dawadk/common/src/logger').forCategory('s3Util');
const s3ApiVersion = '2006-03-01';

const createS3 = () => {
  const config = configHolder.getConfig();
  const s3Config = {
    region: config.get('s3_offload.s3.region'),
    apiVersion: s3ApiVersion,
    accessKeyId: config.get('s3_offload.s3.access_key_id'),
    secretAccessKey: config.get('s3_offload.s3.secret_access_key'),
    endpoint: config.get('s3_offload.s3.endpoint'),
    s3ForcePathStyle: config.get('s3_offload.s3.force_path_style')
  };
  logger.info('Creating s3 config', s3Config);
  return new S3Util(s3Config);
};

module.exports = {
  createS3
};