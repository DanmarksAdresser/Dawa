module.exports = {
  database_url: {
    doc: 'URL som anvendes ved forbindelse til databasen',
    format: '*',
    cli: true,
    sensitive: true,
    required: true
  },
  importer_timeout: {
    doc: 'Terminer importer efter angivne antal sekunder. 0 deaktiverer.',
    format: 'int',
    cli: true,
    default: 0
  }
};