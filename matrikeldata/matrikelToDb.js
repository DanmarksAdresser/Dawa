"use strict";

var child_process = require('child_process');
var fs = require('fs');
var q = require('q');
var _ = require('underscore');

var cliParameterParsing = require('../bbr/common/cliParameterParsing');
var ejerlav = require('./ejerlav');
var proddb = require('../psql/proddb');

var optionSpec = {
  sourceDir: [false, 'Directory hvor matrikel-filerne ligger', 'string', '.'],
  pgConnectionUrl: [false, 'URL som anvendes ved forbindelse til databasen', 'string'],
  init: [false, 'Initialiserende indlæsning - KUN FØRSTE GANG', 'boolean', false]
};


function parseEjerlavkode(file) {
  var ejerlav_regex = /^([\d]+)_.*$/g;
  var match = ejerlav_regex.exec(file);
  return parseInt(match[1], 10);
}

cliParameterParsing.main(optionSpec, _.keys(optionSpec), function (args, options) {
  proddb.init({
    connString: options.pgConnectionUrl,
    pooled: false
  });
  var files = fs.readdirSync(options.sourceDir).filter(function(file) {
    return /^.+\.zip$/.test(file);
  });

  files.map(function(file) {
    return function() {
      var ejerlavkode = parseEjerlavkode(file);
      return q.nfcall(child_process.exec, "unzip -p " + file,
        {
          cwd: options.sourceDir,
          maxBuffer: 1024 * 1024 * 128
        }
      ).then(function (stdout) {
        var gml = stdout.toString('utf-8');
        return ejerlav.parseEjerlav(gml);
      }).then(function(jordstykker) {
          jordstykker.forEach(function(jordstykke) {
            if(jordstykke.fields.ejerlavkode !== ejerlavkode) {
              return q.reject(new Error("Ejerlavkode for jordstykket matchede ikke ejerlavkode for filen"));
            }
          });
          return proddb.withTransaction('READ_WRITE', function(client) {
            return ejerlav.storeEjerlav(ejerlavkode, jordstykker, client, { init: options.init });
          });
        }).then(function() {
          console.log('successfully stored ejerlav');
        });
    };
  }).reduce(q.when, q([])).done();
});