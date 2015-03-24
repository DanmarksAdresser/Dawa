"use strict";

var fs = require('fs');
var path = require('path');
var _ = require('underscore');
var q = require('q');

var cliParameterParsing = require('../bbr/common/cliParameterParsing');
var proddb = require('../psql/proddb');
var importDarImpl = require('./importDarImpl');
var logger = require('../logger').forCategory('divergens');

var csvSpec = importDarImpl.csvSpec;

var optionSpec = {
  pgConnectionUrl: [false, 'URL som anvendes ved forbindelse til databasen', 'string'],
  dataDir: [false, 'Folder med CSV-filer', 'string'],
  initial: [false, 'Whether this is an initial import', 'boolean', false]
};

cliParameterParsing.main(optionSpec, _.keys(optionSpec), function(args, options) {
  var dataDir = options.dataDir;
  var initial = options.initial;
  proddb.init({
    connString: options.pgConnectionUrl,
    pooled: false
  });

  proddb.withTransaction('READ_WRITE', function (client) {
    var importTasks;
    if(initial) {
      importTasks = _.map(csvSpec, function (spec, entityName) {
        return function () {
          console.log('Importing ' + entityName);
          return importDarImpl.loadCsvFile(client, path.join(dataDir, spec.filename), spec.table, spec);
        };
      });

      return importTasks.reduce(q.when);
    }
    else {
      importTasks = _.map(csvSpec, function(spec, entityName) {
        return function() {
          console.log('Importing ' + entityName);
          return importDarImpl.updateTableFromCsv(client, path.join(dataDir, spec.filename), spec.table, spec, false);
        };
      });
      return importTasks.reduce(q.when);
    }
  })
    .then(function () {

    }).done();
});