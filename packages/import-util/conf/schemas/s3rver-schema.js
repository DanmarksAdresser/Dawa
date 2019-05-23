module.exports = {
  test: {
    s3rver: {
      port: {
        format: 'nat',
        doc: 'The port s3 server listens on',
        default: 4569
      },
      hostname: {
        format: 'String',
        doc: 'host to bind to',
        default: '0.0.0.0'
      },
      silent: {
        format: 'Boolean',
        doc: 'Whether to output logs or not',
        default: false
      },
      directory: {
        format: 'string',
        doc: 'The directory where files are stored - generate a tmp dir if null',
        default: null
      },
      bucket: {
        format: "String",
        doc: 'Bucket to create on startup if not exists',
        default: 'dawa'
      }
    }
  }
};