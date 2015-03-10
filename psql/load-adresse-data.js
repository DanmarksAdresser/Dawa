"use strict";

var q = require('q');

var cliParameterParsing = require('../bbr/common/cliParameterParsing');
var loadAdresseDataImpl = require('./load-adresse-data-impl');
var proddb = require('./proddb');

var optionSpec = {
  pgConnectionUrl: [false, 'URL som anvendes ved forbindelse til databasen', 'string'],
  dataDir: [false, 'Folder med CSV-filer (gzippede)', 'string'],
  filePrefix: [false, 'Prefix paa BBR-filer, f.eks. \'T_20140328_\'', 'string', ''],
  format: [false, 'CSV format (legacy eller bbr)', 'string', 'bbr']
};

cliParameterParsing.main(optionSpec,['pgConnectionUrl', 'dataDir', 'format'], function(args, options) {
  proddb.init({ connString: options.pgConnectionUrl, pooled: false});
  proddb.withTransaction('READ_WRITE', function(client) {
    return q.nfcall(loadAdresseDataImpl.load, client, options);
  }).done();
});