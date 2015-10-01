"use strict";

var fs = require('fs');
var q = require('q');
var _ = require('underscore');

var cliParameterParsing = require('../bbr/common/cliParameterParsing');
var datamodels = require('../crud/datamodel');
var divergensImpl = require('../psql/divergensImpl');
var importDarImpl = require('./importDarImpl');
var proddb = require('../psql/proddb');
var qUtil = require('../q-util');

var optionSpec = {
  pgConnectionUrl: [false, 'URL som anvendes ved forbindelse til databasen', 'string'],
  output: [false, 'Output file', 'string']
};

cliParameterParsing.main(optionSpec, _.keys(optionSpec), function (args, options) {
  proddb.init({
    connString: options.pgConnectionUrl,
    pooled: false
  });
  var comparisonDatamodels = _.clone(datamodels);
  comparisonDatamodels.adgangsadresse.columns = _.without(datamodels.adgangsadresse.columns,
    'ejerlavkode', 'matrikelnr', 'esrejendomsnr');

  return proddb.withTransaction('READ_WRITE', function (client) {
    return importDarImpl.createFullViews(client)
      .then(function () {
        return qUtil.mapSerial(['vejstykke', 'adgangsadresse', 'adresse'], function (entityName) {
          var datamodel = comparisonDatamodels[entityName];
          var matTable = 'full_' + datamodel.table;
          return divergensImpl.computeTableDifferences(client,
            datamodel,
            matTable,
            datamodel.table,
            10000
          );
        });
      })
      .then(function (differencesArray) {
        if (options.output) {
          return q.nfcall(fs.writeFile, options.output, JSON.stringify(differencesArray, null, 2), {encoding: 'utf-8'});
        }
        else {
          /*eslint no-console:0 */
          console.log(JSON.stringify(differencesArray, null, 2));
        }
      });
  }).done();
});
