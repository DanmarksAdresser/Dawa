"use strict";

var _ = require('underscore');

var cliParameterParsing = require('../bbr/common/cliParameterParsing');
var importOisImpl = require('./importOisImpl');
var proddb = require('../psql/proddb');

var optionSpec = {
  pgConnectionUrl: [false, 'URL som anvendes ved forbindelse til databasen', 'string'],
  dataDir: [false, 'Folder med CSV-filer', 'string'],
  initial: [false, 'Angiver, om der er tale om første indlæsning', 'boolean', false]
};

cliParameterParsing.main(optionSpec, _.keys(optionSpec), function(args, options) {
  proddb.init({
    connString: options.pgConnectionUrl,
    pooled: false
  });
  proddb.withTransaction('READ_WRITE', function (client) {
    if(options.initial) {
      return importOisImpl.importInitial(client, options.dataDir);
    }
    else {
      return importOisImpl.importUpdate(client, options.dataDir);
    }
  }).done();
});