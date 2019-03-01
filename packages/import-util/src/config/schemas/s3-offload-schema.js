module.exports = {
  s3_offload: {
    s3: {
      region: {
        default: 'eu-west-1',
        format: 'String',
        doc: 'AWS region'
      },
      access_key_id: {
        format: 'String',
        doc: 'AWS Access key ID'
      },
      secret_access_key: {
        format: 'String',
        sensitive: true,
        doc: 'AWS secret access key'
      },
      endpoint: {
        format: 'String',
        default: null,
        doc: 'AWS endpoint. I prod sættes AWS endpoint ud fra region, så i prod skal endpoint være null.'
      },
      force_path_style: {
        format: 'boolean',
        doc: 'Anvend "path style" for S3 stier. skal være false i prod - anvendes kun til test.'
      }
    },
    bucket: {
      format: 'String',
      doc: 'S3 bucket'
    },
    path: {
      format: 'String',
      doc: 'Stien i S3 hvor LOBs gemmes'
    },
    threshold: {
      format: 'nat',
      default: 4096,
      doc: 'Angiver grænsen for hvor store LOBs skal være før de offloades til S3.'
    },
  }
};
