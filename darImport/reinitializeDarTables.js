"use strict";

var q = require('q');
var _ = require('underscore');

var cliParameterParsing = require('../bbr/common/cliParameterParsing');
var importDarImpl = require('./importDarImpl');
var logger = require('../logger').forCategory('darImport');
var proddb = require('../psql/proddb');

var optionSpec = {
  pgConnectionUrl: [false, 'URL som anvendes ved forbindelse til databasen', 'string'],
  dataDir: [false, 'Folder med CSV-filer', 'string']
};

cliParameterParsing.main(optionSpec, _.keys(optionSpec), function(args, options) {
  var dataDir = options.dataDir;
  proddb.init({
    connString: options.pgConnectionUrl,
    pooled: false
  });

  proddb.withTransaction('READ_WRITE', function (client) {
    return q()
      .then(function() {
        return importDarImpl.clearDarTables(client);
      })
      .then(function() {
        return importDarImpl.withDarTransaction(client, 'csv', function() {
            return importDarImpl.initDarTables(client, dataDir);
        });
      })
      .then(function() {
        return client.queryp('analyze;');
      });
  }).catch(function(err) {
    logger.error('Caught error in importDar', err);
    return q.reject(err);
  })
    .done();
});