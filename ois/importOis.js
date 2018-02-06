"use strict";

var _ = require('underscore');

var cliParameterParsing = require('../bbr/common/cliParameterParsing');
var importOisImpl = require('./importOisImpl');
var proddb = require('../psql/proddb');
const { go } = require('ts-csp');

require('sax').MAX_BUFFER_LENGTH = 512 * 1024;

var optionSpec = {
  pgConnectionUrl: [false, 'URL som anvendes ved forbindelse til databasen', 'string'],
  dataDir: [false, 'Folder med CSV-filer', 'string'],
  fileName: [false, 'Indlæs én fil', 'string'],
  clean: [false, 'Clear database before importing', 'boolean', false],
  entities: [false, 'Importer/slet kun udvalgte entiteter', 'string']
};

cliParameterParsing.main(optionSpec, _.without(_.keys(optionSpec), 'fileName', 'entities'),
  function (args, options) {
    proddb.init({
      connString: options.pgConnectionUrl,
      pooled: false
    });
    proddb.withTransaction('READ_WRITE_CONCURRENT',  (client) => go(function*() {
      yield importOisImpl.importOis(client, options.dataDir, options.fileName, options.clean,
        options.entities ? options.entities.split(',') : null);
    })).done();
  });
