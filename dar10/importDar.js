"use strict";

const q = require('q');
const _ = require('underscore');

const cliParameterParsing = require('../bbr/common/cliParameterParsing');
const importDarImpl = require('./importDarImpl');
const proddb = require('../psql/proddb');


const optionSpec = {
  pgConnectionUrl: [false, 'URL som anvendes ved forbindelse til databasen', 'string'],
  dataDir: [false, 'Folder med NDJSON-filer', 'string'],
  skipDawa: [false, 'Skip DAWA updates', 'boolean', false],
  clear: [false, 'Ryd gamle DAR 1.0 data', 'boolean', false]
};

cliParameterParsing.main(optionSpec, _.keys(optionSpec), function(args, options) {
  proddb.init({
    connString: options.pgConnectionUrl,
    pooled: false
  });

  proddb.withTransaction('READ_WRITE', client => {
    return q.async(function*() {
      if(options.clear) {
        yield importDarImpl.clearDar(client);
      }
      yield importDarImpl.importFromFiles(client, options.dataDir, options.skipDawa);
    })();
  }).done();
});
