"use strict";

var winston = require('winston');

var sqlCommon = require('./common');

var cliParameterParsing = require('../bbr/common/cliParameterParsing');
var loadAdresseDataImpl = require('./load-adresse-data-impl');

var optionSpec = {
  pgConnectionUrl: [false, 'URL som anvendes ved forbindelse til databasen', 'string'],
  dataDir: [false, 'Folder med CSV-filer (gzippede)', 'string'],
  filePrefix: [false, 'Prefix paa BBR-filer, f.eks. \'T_20140328_\'', 'string', ''],
  format: [false, 'CSV format (legacy eller bbr)', 'string', 'bbr']
};

function exitOnErr(err){
  if (err){
    winston.error("Error: %j", err, {});
    process.exit(1);
  }
}
cliParameterParsing.main(optionSpec,['pgConnectionUrl', 'dataDir', 'format'], function(args, options) {
  sqlCommon.withWriteTransaction(options.pgConnectionUrl, function(err, client, commit) {
    exitOnErr(err);
    loadAdresseDataImpl.load(client, options, function(err) {
      exitOnErr(err);
      commit(err, function(err) {
        exitOnErr(err);
      });
    });
  });
});