"use strict";

const q = require('q');
const _ = require('underscore');

const cliParameterParsing = require('../bbr/common/cliParameterParsing');
const importAdresseHeightsImpl = require('./importAdresseHeightsImpl');
const proddb = require('../psql/proddb');

const optionSpec = {
  pgConnectionUrl: [false, 'URL som anvendes ved forbindelse til databasen', 'string'],
  file: [false, 'Fil med vejmidter', 'string'],
  initial: [false,
    'Sættes til true hvis dette er initiel import. Springer historik-dannelse over.',
    'boolean', false]
};

cliParameterParsing.main(optionSpec, _.keys(optionSpec), function (args, options) {
  proddb.init({
    connString: options.pgConnectionUrl
  });

  proddb.withTransaction('READ_WRITE', client => {
    return q.async(function*() {
      yield importAdresseHeightsImpl.importHeights(client, options.file, options.initial);
    })();
  });
});
