"use strict";

var _ = require('underscore');

var cliParameterParsing = require('../bbr/common/cliParameterParsing');
var importOisImpl = require('./importOisImpl');
var proddb = require('../psql/proddb');
const { go } = require('ts-csp');

var optionSpec = {
  pgConnectionUrl: [false, 'URL som anvendes ved forbindelse til databasen', 'string'],
  dataDir: [false, 'Folder med CSV-filer', 'string'],
  fileName: [false, 'Indlæs én fil', 'string'],
  clean: [false, 'Clear database before importing', 'boolean', false]
};

cliParameterParsing.main(optionSpec, _.without(_.keys(optionSpec), 'fileName'),
  function (args, options) {
    proddb.init({
      connString: options.pgConnectionUrl,
      pooled: false
    });
    proddb.withTransaction('READ_WRITE',  (client) => go(function*() {
      yield importOisImpl.importOis(client, options.dataDir, options.fileName, options.clean);
    })).done();
  });
