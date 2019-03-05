module.exports = {
  test: {
    database_user: {
      format: 'string',
      default: null
    },
    database_password: {
      format: 'string',
      default: null,
      sensitive: true
    },
    database_host: {
      format: 'string',
      default: 'localhost'
    },
    database_port: {
      format: 'nat',
      default: 5432
    },
    data_db: {
      format: 'string',
      default: 'dawatest'
    },
    schema_db: {
      format: 'string',
      default: 'dawaschema'
    },
    empty_db: {
      format: 'string',
      default: 'dawaempty'
    }
  }
};