"use strict";

var q = require('q');
var _ = require('underscore');

const cliParameterParsing = require('../bbr/common/cliParameterParsing');
const proddb = require('../psql/proddb');
const importJordstykkerImpl = require('./importJordstykkerImpl');

var optionSpec = {
  sourceDir: [false, 'Directory hvor matrikel-filerne ligger', 'string', '.'],
  pgConnectionUrl: [false, 'URL som anvendes ved forbindelse til databasen', 'string'],
  lastUpdated: [false, 'Timestamp for seneste opdatering, f.eks. "2015-02-18 12:34:48+02:00', 'string'],
  init: [false, 'Initialiserende indlæsning - KUN FØRSTE GANG', 'boolean', false]
};

q.longStackSupport = true;

cliParameterParsing.main(optionSpec, _.without(_.keys(optionSpec), 'lastUpdated'), function (args, options) {
  proddb.init({
    connString: options.pgConnectionUrl,
    pooled: false
  });

  importJordstykkerImpl.doImport(proddb, options.sourceDir, options.init).done();
});
