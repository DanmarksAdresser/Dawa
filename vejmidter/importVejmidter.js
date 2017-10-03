"use strict";

const _ = require('underscore');

const { runImporter } = require('../importUtil/runImporter');
const importVejmidterImpl = require('./importVejmidterImpl');
const proddb = require('../psql/proddb');
const logger = require('../logger').forCategory('Vejmidter');
const { go } = require('ts-csp');

const optionSpec = {
  pgConnectionUrl: [false, 'URL som anvendes ved forbindelse til databasen', 'string'],
  file: [false, 'Fil med vejmidter', 'string'],
  initial: [false,
    'Sættes til true hvis dette er initiel import. Springer historik-dannelse over.',
    'boolean', false]
};

runImporter('vejmidter', optionSpec, _.keys(optionSpec), function (args, options) {
  proddb.init({
    connString: options.pgConnectionUrl,
    pooled: false
  });

  return proddb.withTransaction('READ_WRITE', client => go(function*() {
      yield importVejmidterImpl.importVejmidter(client, options.file, 'vejstykker', options.initial);
      logger.info('Successfully imported vejmidter');
  }));
});
