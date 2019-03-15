const {mergeConfigSchemas} = require('@dawadk/common/src/config/holder');
module.exports = mergeConfigSchemas([require('./s3-offload-common-schema'), {
  s3_offload: {
    s3: {
      region: {
        default: 'eu-west-1',
        format: 'string',
        doc: 'AWS region'
      },
      access_key_id: {
        format: 'string',
        doc: 'AWS Access key ID',
        default: null
      },
      secret_access_key: {
        format: 'string',
        sensitive: true,
        doc: 'AWS secret access key',
        default: null
      }
    },
    threshold: {
      format: 'nat',
      default: 4096,
      doc: 'Angiver grænsen for hvor store LOBs skal være før de offloades til S3.'
    },
  }
}]);
