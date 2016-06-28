"use strict";

const q = require('q');
const _ = require('underscore');

const cliParameterParsing = require('../bbr/common/cliParameterParsing');
const importDarImpl = require('./importDarImpl');
const proddb = require('../psql/proddb');


const optionSpec = {
  pgConnectionUrl: [false, 'URL som anvendes ved forbindelse til databasen', 'string'],
  dataDir: [false, 'Folder med NDJSON-filer', 'string'],
  initial: [false, 'Whether this is an initial import', 'boolean', false],
  clear: [false, 'Completely remove old DAWA data and history', 'boolean', false]
};

cliParameterParsing.main(optionSpec, _.keys(optionSpec), function(args, options) {
  proddb.init({
    connString: options.pgConnectionUrl,
    pooled: false
  });

  proddb.withTransaction('READ_WRITE', client => {
    return q.async(function*() {
      if(options.initial) {
        yield importDarImpl.importInitial(client, options.dataDir);
      }
      else {
        yield importDarImpl.importIncremental(client, options.dataDir, 0);
      }
    })();
  }).done();
});
