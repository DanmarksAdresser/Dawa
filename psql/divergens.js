"use strict";

var fs = require('fs');
var _ = require('underscore');
var Q = require('q');

var cliParameterParsing = require('../bbr/common/cliParameterParsing');
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
  forceDawaSequenceNumber: [false, 'Sammenlign med tilstand ved dette sekvensnummer', 'number'],
  reportFile: [false, 'Fil, som JSON rapport skrives i', 'string']
};

cliParameterParsing.main(optionSpec, _.without(_.keys(optionSpec), 'filePrefix', 'sekvensnummer', 'rectify', 'compareWithCurrent', 'forceDawaSequenceNumber'), function(args, options) {

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
        forceDawaSequenceNumber: options.forceDawaSequenceNumber
      }).then(
      function(report) {
        console.log(JSON.stringify(report));
        if (options.rectify) {
          return divergensImpl.rectifyAll(client, report);
        }
        else {
          return report;
        }
      }).then(function(report) {
        if (options.reportFile) {
          fs.writeFileSync(options.reportFile, JSON.stringify(report, null, 2));
        }
      }).then(function() {
        return Q.nfcall(done, null);
      }).done();
  });
});