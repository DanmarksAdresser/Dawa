module.exports = {
  test: {
    database_user: {
      format: 'String',
      default: null
    },
    database_password: {
      format: 'String',
      default: null,
      sensitive: true
    },
    database_host: {
      format: 'String',
      default: 'localhost'
    },
    database_port: {
      format: 'nat',
      default: 5432
    },
    data_db: {
      format: 'String',
      default: 'dawatest'
    },
    schema_db: {
      format: 'String',
      default: 'dawaschema'
    },
    empty_db: {
      format: 'String',
      default: 'dawaempty'
    }
  }
};