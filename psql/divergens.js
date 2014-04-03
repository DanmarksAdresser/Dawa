"use strict";

var async = require('async');
var winston = require('winston');
var _ = require('underscore');

var cliParameterParsing = require('../bbr/common/cliParameterParsing');
var loadAdresseData = require('./load-adresse-data-impl');
var dbapi2 = require('../dbapi2');
var datamodels = require('../crud/datamodel');
var dataUtil = require('./dataUtil');

var optionSpec = {
  pgConnectionUrl: [false, 'URL som anvendes ved forbindelse til databasen', 'string'],
  dataDir: [false, 'Folder med CSV-filer (gzippede)', 'string'],
  filePrefix: [false, 'Prefix paa BBR-filer, f.eks. \'T_20140328_\'', 'string'],
  format: [false, 'CSV format (legacy eller bbr)', 'string', 'bbr'],
  sekvensnummer: [false, 'sekvensnummer for udtrækket', 'number']
};

function exitOnErr(err){
  if (err){
    winston.error("Error: %j", err, {});
    process.exit(1);
  }
}

cliParameterParsing.main(optionSpec, _.without(_.keys(optionSpec), 'filePrefix'), function(args, options) {
  var dbapi = dbapi2({
    dbUrl: options.pgConnectionUrl
  });
  var expectedTablePrefix = 'expected_';
  var actualTablePrefix = 'actual_';
  var loadAdresseDataOptions = {
    dataDir: options.dataDir,
    filePrefix: options.filePrefix,
    format: options.format,
    tablePrefix: expectedTablePrefix
  };

  dbapi.withRollbackTransaction(function(err, client, done) {
    async.series([
      function(cb) {
        async.eachSeries(_.keys(datamodels), function(dataModelName, cb) {
          var datamodel = datamodels[dataModelName];
          dataUtil.createTempTable(client, expectedTablePrefix + datamodel.table, datamodel.table, cb);
        }, cb);
      },
      function(cb) {
        loadAdresseData.loadCsvOnly(client, loadAdresseDataOptions, cb);
      },
      function(cb) {
        winston.info('Computing snapshots from history');
        async.eachSeries(_.keys(datamodels), function(dataModelName, cb) {
          var datamodel = datamodels[dataModelName];
          var actualTableName = actualTablePrefix + datamodel.table;
          dataUtil.createTempTable(client, actualTableName, datamodel.table, function(err) {
            exitOnErr(err);
            console.log('inserting snapshot into temp table');
            var sql = 'INSERT INTO ' + actualTableName  + '(' + datamodel.columns.join(', ') + ') (' + dataUtil.snapshotQuery(datamodel, '$1') + ')';
            console.log(sql);
            client.query(sql, [options.sekvensnummer], function(err) {
              exitOnErr(err);
              console.log('insertion complete');
              dataUtil.queryDifferences(client, expectedTablePrefix + datamodel.table, actualTableName, datamodel, function(err, result) {
                exitOnErr(err);
                if(result.length > 0) {
                  winston.error(JSON.stringify(result));
                }
                console.log('continuing');
                cb(err);
              });
            });
          });
        }, cb);
      }
    ], function(err) {
      exitOnErr(err);
    });
  });
});