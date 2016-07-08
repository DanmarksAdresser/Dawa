"use strict";

const q = require('q');
const _ = require('underscore');

const cliParameterParsing = require('../bbr/common/cliParameterParsing');
const importBebyggelserImpl = require('./importBebyggelserImpl');
const proddb = require('../psql/proddb');

const optionSpec = {
  pgConnectionUrl: [false, 'URL som anvendes ved forbindelse til databasen', 'string'],
  file: [false, 'Fil med bebyggelser', 'string'],
  initial: [false,
    'Sættes til true hvis dette er initiel import.',
    'boolean', false],
  skipsanitycheck: [false, 'Spring over sanity check af import', 'boolean', false]
};

cliParameterParsing.main(optionSpec, _.keys(optionSpec), function (args, options) {
  proddb.init({
    connString: options.pgConnectionUrl,
    pooled: false
  });

  proddb.withTransaction('READ_WRITE', client => {
    return q.async(function*() {
      yield importBebyggelserImpl.importBebyggelser(client, options.file, 'bebyggelser', options.initial, options.skipsanitycheck);
    })();
  }).done();
});
