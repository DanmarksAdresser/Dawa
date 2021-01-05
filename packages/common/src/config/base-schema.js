module.exports = {
  logging: {
    directory: {
      default: '.',
      format: 'string',
      doc: 'Directory to log to'
    },
    file_name_suffix: {
      default: '', // empty file name suffix disables logging to file and logs to console instead
      format: 'string',
      doc: 'File name suffix for log files'
    },
    max_size: {
      default: 1024 * 1024 * 1024,
      format: 'nat',
      doc: 'Maximum file size for log files'
    },
    max_files: {
      default: 10,
      format: 'nat',
      doc: 'Max number of log files before they are deleted.'
    },
    default_level: {
      default: 'info',
      format: 'string',
      doc: 'Default log level.'
    },
    log_sql: {
      doc: "Whether to log SQL statements",
      format: 'boolean',
      default: true,
      cli: true
    },
    log_sql_threshold: {
      doc: 'Set a threshold for SQL statement logging (ms). Only statements slower than threshold will be logged',
      format: 'nat',
      default: 1000,
      cli: true
    }
  },
  config_files: {
    default: '',
    format: 'string',
    env: 'CONFIG_FILES',
    cli: true,
    doc: 'Comma-separated list of configuration files to load'
  }
};

