"use strict";

var fs = require('fs');
var _ = require('underscore');
var Q = require('q');

var cliParameterParsing = require('../bbr/common/cliParameterParsing');
var sqlCommon = require('./common');
var divergensImpl = require('./divergensImpl');
var logger = require('../logger').forCategory('divergens');

var optionSpec = {
  pgConnectionUrl: [false, 'URL som anvendes ved forbindelse til databasen', 'string'],
  dataDir: [false, 'Folder med CSV-filer (gzippede)', 'string'],
  filePrefix: [false, 'Prefix paa BBR-filer, f.eks. \'T_20140328_\'', 'string', ''],
  format: [false, 'CSV format (legacy eller bbr)', 'string', 'bbr'],
  compareWithCurrent: [false, 'Angiver, at sammenligningen skal ske med den aktuelle tilstand af databasen, uanset evt. sekvensnummer' +
    'angivet i udtrækket', 'boolean'],
  rectify: [false, 'Korriger forskelle ved at foretage de noedvendige ændringer i data', 'boolean' ],
  forceDawaSequenceNumber: [false, 'Sammenlign med tilstand ved dette sekvensnummer', 'number'],
  reportFile: [false, 'Fil, som JSON rapport skrives i', 'string'],
  maxUpdates: [false, 'Maksimalt antal tilladte ændringer', 'number', 10000],
  batchSize: [false, 'Max antal ændringer pr. datatype der udføres/rapporteres', 'number']
};

function countUpdates(report) {
  return _.reduce(['adgangsadresse', 'adresse', 'vejstykke'], function(memo, datamodelName) {
    var datamodelReport = report[datamodelName];
    return memo + datamodelReport.inserts.length + datamodelReport.updates.length + datamodelReport.deletes.length;
  }, 0);
}

function saveReport(options, report) {
  fs.writeFileSync(options.reportFile, JSON.stringify(report, null, 2));
}
cliParameterParsing.main(optionSpec, _.without(_.keys(optionSpec), 'filePrefix', 'sekvensnummer', 'rectify', 'compareWithCurrent', 'forceDawaSequenceNumber', 'batchSize'), function(args, options) {

  if(options.format !== 'bbr' && options.sekvensnummer === undefined) {
    throw new Error('Hvis format ikke er bbr skal der angives et sekvensnummer for udtrækket');
  }

  sqlCommon.withWriteTransaction(options.pgConnectionUrl, function(err, client, done) {
    var loadAdresseDataOptions = {
      dataDir: options.dataDir,
      filePrefix: options.filePrefix,
      format: options.format
    };

    divergensImpl.divergenceReport(client, loadAdresseDataOptions, {
        compareWithCurrent: options.compareWithCurrent,
        batchSize: options.batchSize,
        forceDawaSequenceNumber: options.forceDawaSequenceNumber
      }).then(
      function(report) {
        if (options.rectify) {
          if(options.maxUpdates < countUpdates(report)) {
            logger.error('Divergence check resulted in too many changes. Aborting.', {
              maxUpdates: options.maxUpdates,
              actualUpdates: countUpdates(report),
              reportFileName: options.reportFile
            });
            saveReport(options, report);
            throw new Error('Divergence check resulted in too many changes. Aborting.');
          }
          return divergensImpl.rectifyAll(client, report);
        }
        else {
          return report;
        }
      }).then(function(report) {
        if (options.reportFile) {
          saveReport(options, report);
        }
      }).then(function() {
        return Q.nfcall(done, null);
      }).done();
  });
});