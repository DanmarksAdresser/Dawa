"use strict";

var fs = require('fs');
var q = require('q');
var _ = require('underscore');

var cliParameterParsing = require('../bbr/common/cliParameterParsing');
var datamodels = require('../crud/datamodel');
var divergensImpl = require('../psql/divergensImpl');
var importDarImpl = require('./importDarImpl');
var loadAdresseDataImpl = require('../psql/load-adresse-data-impl');
var proddb = require('../psql/proddb');
var sqlCommon = require('../psql/common');
var qUtil = require('../q-util');

var optionSpec = {
  pgConnectionUrl: [false, 'URL som anvendes ved forbindelse til databasen', 'string'],
  bbrDataDir: [false, 'Folder med BBR CSV-filer', 'string'],
  bbrFilePrefix: [false, 'Prefix for BBR filer', 'string', ''],
  darDataDir: [false, 'Folder med DAR CSV-filer', 'string'],
  output: [false, 'Output file', 'string']
};

cliParameterParsing.main(optionSpec, _.keys(optionSpec), function(args, options) {
  var bbrDataDir = options.bbrDataDir;
  var darDataDir = options.darDataDir;
  var bbrFilePrefix = options.bbrFilePrefix;
  proddb.init({
    connString: options.pgConnectionUrl,
    pooled: false
  });
  var comparisonDatamodels = _.clone(datamodels);
  comparisonDatamodels.adgangsadresse.columns = _.without(datamodels.adgangsadresse.columns,
    'ejerlavkode', 'matrikelnr', 'esrejendomsnr',
    'journalnummer', 'esdhreference', 'husnummerkilde');
  comparisonDatamodels.adresse.columns = _.without(datamodels.adresse.columns,
    'journalnummer', 'esdhreference', 'kilde');

  proddb.withTransaction('READ_WRITE', function (client) {
    console.log('Initializing DAR tables');
    return importDarImpl.initDarTables(client, darDataDir)
      .then(function () {
        return sqlCommon.disableTriggersQ(client);
      })
      .then(function() {
        return loadAdresseDataImpl.loadCsvOnly(client, {
          format: 'bbr',
          dataDir: bbrDataDir,
          filePrefix: bbrFilePrefix
        });
      })
      .then(function() {
        return sqlCommon.enableTriggersQ(client);
      })
      .then(function() {
        return client.queryp('analyze', []);
      });
  })
      .then(function() {
        return proddb.withTransaction('READ_WRITE', function (client) {
          return qUtil.mapSerial(['vejstykke', 'adgangsadresse', 'adresse'], function(entityName) {
            console.log('materializing ' + entityName);
            var datamodel = comparisonDatamodels[entityName];
            var matTable = 'mat_' + datamodel.table;
            var darView = 'dar_' + datamodel.table + '_view';
            return client.queryp('CREATE TABLE ' + matTable + ' AS SELECT * FROM ' + darView,[]);
        });
      })
      .then(function() {
        return proddb.withTransaction('READ_WRITE', function (client) {
          return qUtil.mapSerial(['vejstykke', 'adgangsadresse', 'adresse'], function(entityName) {
            var datamodel = comparisonDatamodels[entityName];
            var matTable = 'mat_' + datamodel.table;
            return divergensImpl.computeTableDifferences(client,
              datamodel,
              matTable,
              datamodel.table,
              10000
            );
          })
            .then(function(differencesArray) {
              if(options.output) {
                return q.nfcall(fs.writeFile, options.output, JSON.stringify(differencesArray, null, 2), {encoding: 'utf-8'});
              }
              else {
                console.log(JSON.stringify(differencesArray, null, 2));
              }
          });
        });
      });
  }).done();
});