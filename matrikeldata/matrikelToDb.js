"use strict";

var child_process = require('child_process');
var fs = require('fs');
var moment = require('moment');
var path = require('path');
var q = require('q');
var _ = require('underscore');

var cliParameterParsing = require('../bbr/common/cliParameterParsing');
var ejerlav = require('./ejerlav');
var proddb = require('../psql/proddb');
var tema = require('../temaer/tema.js');
var temaer = require('../apiSpecification/temaer/temaer');


var optionSpec = {
  sourceDir: [false, 'Directory hvor matrikel-filerne ligger', 'string', '.'],
  pgConnectionUrl: [false, 'URL som anvendes ved forbindelse til databasen', 'string'],
  lastUpdated: [false, 'Timestamp for seneste opdatering, f.eks. "2015-02-18 12:34:48+02:00', 'string'],
  init: [false, 'Initialiserende indlæsning - KUN FØRSTE GANG', 'boolean', false]
};

q.longStackSupport = true;


function parseEjerlavkode(file) {
  var ejerlav_regex = /^([\d]+)_.*$/g;
  var match = ejerlav_regex.exec(file);
  return parseInt(match[1], 10);
}

cliParameterParsing.main(optionSpec, _.without(_.keys(optionSpec), 'lastUpdated'), function (args, options) {
  proddb.init({
    connString: options.pgConnectionUrl,
    pooled: false
  });
  var lastUpdated = options.lastUpdated ? moment(options.lastUpdated) : null;

  var files = fs.readdirSync(options.sourceDir).filter(function(file) {
    return /^.+\.zip$/.test(file);
  });

  var atLeastOneFileProcessed = false;

  files.map(function(file) {
    return function() {
      var stats = fs.statSync(path.join(options.sourceDir, file));
      var ctime = moment(stats.ctime);
      if(ctime.isBefore(lastUpdated)) {
        console.log("Skipping file " + file + ", it has not been modified since last update");
        return;
      }
      atLeastOneFileProcessed = true;
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
  }).reduce(q.when, q([])).then(function() {
    if(atLeastOneFileProcessed) {
      return proddb.withTransaction('READ_WRITE', function(client) {
        var temaDef = tema.findTema('jordstykke');
        return tema.updateAdresserTemaerView(client, temaDef, options.init);
      });
    }
    else {
      console.log("Ingen opdatering af temamapninger, da ingen ejerlav er opdateret");
    }
  }).done();
});