"use strict";

var fs = require('fs');
var path = require('path');

var JSZip = require("jszip");
var Q = require('q');
var _ = require('underscore');

var cliParameterParsing = require('../bbr/common/cliParameterParsing');
var ejerlav = require('./ejerlav');

var optionSpec = {
  sourceDir: [false, 'Directory hvor matrikel-filerne ligger', 'string', '.'],
  pgConnectionUrl: [false, 'URL som anvendes ved forbindelse til databasen', 'string'],
  init: [false, 'Initialiserende indlæsning - KUN FØRSTE GANG', 'boolean', false]
};

cliParameterParsing.main(optionSpec, _.keys(optionSpec), function (args, options) {
  var files = fs.readdirSync(options.sourceDir);
  var jordstykker = [];
  files.map(function(file) {
    return function() {
      var filePath = path.join(options.sourceDir, file);
      var gmlZipBuf = fs.readFileSync(filePath);
      var zip = new JSZip(gmlZipBuf);
      var gmlFiles = zip.file(/.*\.gml/);
      if (gmlFiles.length !== 1) {
        throw 'Found ' + gmlFiles.length + " gml files in zip file from " + file + ", expected exactly 1";
      }
      return ejerlav.parseEjerlav(gmlFiles[0].asText()).then(function(result) {
        result.forEach(function(jordstykke) {
          jordstykker.push(jordstykke);
        });
        console.log('count: ' + jordstykker.length);
      });
    };
  }).reduce(Q.when, Q([]));
});