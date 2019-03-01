const S3Util = require('aws-sdk/clients/s3');

const configHolder = require('@dawadk/common/src/config/holder');

const s3ApiVersion = '2006-03-01';

const createS3 = () => {
  const config = configHolder.getConfig();
  return new S3Util({
    region: config.get('s3_offload.s3.region'),
    apiVersion: s3ApiVersion,
    accessKeyId: config.get('s3_offload.s3.access_key_id'),
    secretAccessKey: config.get('s3_offload.s3.secret_access_key'),
    endpoint: config.get('s3_offload.s3.endpoint'),
    s3ForcePathStyle: config.get('s3_offload.s3.force_path_style')
  });
};

module.exports = {
  createS3
};