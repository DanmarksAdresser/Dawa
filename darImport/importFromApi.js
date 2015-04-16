"use strict";

var _ = require('underscore');

var cliParameterParsing = require('../bbr/common/cliParameterParsing');
var importFromApiImpl = require('./importFromApiImpl');
var proddb = require('../psql/proddb');

var optionSpec = {
  pgConnectionUrl: [false, 'URL som anvendes ved forbindelse til databasen', 'string'],
  url: [false, 'Base URL hvorfra data hentes', 'string']
};

cliParameterParsing.main(optionSpec, _.keys(optionSpec), function(args, options) {
  proddb.init({
    connString: options.pgConnectionUrl,
    pooled: false
  });

  var url = options.url;

  proddb.withTransaction('READ_WRITE', function (client) {
    return importFromApiImpl.importFromApi(client, url);
  }).done();
});