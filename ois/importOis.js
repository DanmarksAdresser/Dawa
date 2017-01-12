"use strict";

var _ = require('underscore');

var cliParameterParsing = require('../bbr/common/cliParameterParsing');
var importOisImpl = require('./importOisImpl');
var proddb = require('../psql/proddb');

var optionSpec = {
  pgConnectionUrl: [false, 'URL som anvendes ved forbindelse til databasen', 'string'],
  dataDir: [false, 'Folder med CSV-filer', 'string'],
  fileName: [false, 'Indlæs én fil', 'string']
};

cliParameterParsing.main(optionSpec, _.without(_.keys(optionSpec), 'fileName'),
  function (args, options) {
    proddb.init({
      connString: options.pgConnectionUrl,
      pooled: false
    });
    proddb.withTransaction('READ_WRITE', function (client) {
      return importOisImpl.importOis(client, options.dataDir, options.fileName);
    }).done();
  });
