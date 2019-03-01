module.exports = {
  logging: {
    directory: {
      default: '.',
      format: 'String'
    },
    file_name_suffix: {
      default: '.log',
      format: 'String'
    },
    max_size: {
      default: 1024 * 1024 * 1024,
      format: 'nat'
    },
    max_files: {
      default: 10,
      format: 'nat'
    },
    default_level: {
      default: 'info',
      format: 'String'
    }
  },
  config_files: {
    default: '',
    format: 'String',
    env: 'CONFIG_FILES',
    cli: true,
    doc: 'Comma-separated list of configuration files to load'
  }
};

