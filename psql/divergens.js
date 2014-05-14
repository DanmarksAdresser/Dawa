"use strict";

var async = require('async');
var fs = require('fs');
var winston = require('winston');
var _ = require('underscore');

var cliParameterParsing = require('../bbr/common/cliParameterParsing');
var datamodels = require('../crud/datamodel');
var dbapi;
var sqlCommon = require('./common');
var divergensImpl = require('./divergensImpl');

var optionSpec = {
  pgConnectionUrl: [false, 'URL som anvendes ved forbindelse til databasen', 'string'],
  dataDir: [false, 'Folder med CSV-filer (gzippede)', 'string'],
  filePrefix: [false, 'Prefix paa BBR-filer, f.eks. \'T_20140328_\'', 'string', ''],
  format: [false, 'CSV format (legacy eller bbr)', 'string', 'bbr'],
  compareWithCurrent: [false, 'Angiver, at sammenligningen skal ske med den aktuelle tilstand af databasen, uanset evt. sekvensnummer' +
    'angivet i udtrækket', 'boolean'],
  rectify: [false, 'Korriger forskelle ved at foretage de noedvendige ændringer i data', 'boolean' ],
  reportFile: [false, 'Fil, som JSON rapport skrives i', 'string']
};

function exitOnErr(err){
  if (err){
    winston.error("Error: %j", err, {});
    process.exit(1);
  }
}

cliParameterParsing.main(optionSpec, _.without(_.keys(optionSpec), 'filePrefix', 'sekvensnummer', 'rectify', 'compareWithCurrent'), function(args, options) {
  dbapi = require('../dbapi');

  if(options.format !== 'bbr' && options.sekvensnummer === undefined) {
    throw new Error('Hvis format ikke er bbr skal der angives et sekvensnummer for udtrækket');
  }

  sqlCommon.withWriteTranaction(options.pgConnectionUrl, function(err, client, done) {
    var loadAdresseDataOptions = {
      dataDir: options.dataDir,
      filePrefix: options.filePrefix,
      format: options.format
    };

    divergensImpl.divergence(client, loadAdresseDataOptions, options.compareWithCurrent, function(err, report) {
      exitOnErr(err);
      if(options.rectify) {
        async.eachSeries(['vejstykke', 'adgangsadresse', 'enhedsadresse'], function(dataModelName, callback) {
          var datamodel = datamodels[dataModelName];
          divergensImpl.rectifyDifferences(client, datamodel, report[dataModelName], report.meta.dawaSequenceNumber, callback);
        }, function(err) {
          exitOnErr(err);
          done(null, function(err) {
            exitOnErr(err);
            if(options.reportFile) {
              fs.writeFileSync(options.reportFile, JSON.stringify(report, null, 2));
            }
            winston.info("done!");
          });
        });
      }
    });
  });
});