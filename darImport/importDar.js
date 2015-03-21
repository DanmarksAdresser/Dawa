"use strict";

var fs = require('fs');
var _ = require('underscore');
var Q = require('q');

var cliParameterParsing = require('../bbr/common/cliParameterParsing');
var proddb = require('./proddb');
var importDarImpl = require('./importDarImpl');
var logger = require('../logger').forCategory('divergens');

var optionSpec = {
  pgConnectionUrl: [false, 'URL som anvendes ved forbindelse til databasen', 'string'],
  dataDir: [false, 'Folder med CSV-filer', 'string'],
};

cliParameterParsing.main(optionSpec, _.keys(optionSpec), function(args, options) {
  proddb.init({
    connString: options.pgConnectionUrl,
    pooled: false
  });

  proddb.withTransaction('READ_WRITE', function(client) {
    importDarImpl.loadCsvFile
  })
    .done();
});