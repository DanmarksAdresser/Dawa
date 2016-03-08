"use strict";

var child_process = require('child_process');
var fs = require('fs');
var moment = require('moment');
var path = require('path');
var q = require('q');
var _ = require('underscore');

var cliParameterParsing = require('../bbr/common/cliParameterParsing');
var ejerlav = require('./ejerlav');
var logger = require('../logger').forCategory('matrikelImport');
var proddb = require('../psql/proddb');
var tema = require('../temaer/tema.js');

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

  var files = fs.readdirSync(options.sourceDir).filter(function(file) {
    return /^.+\.zip$/.test(file);
  });

  var atLeastOneFileProcessed = false;

  function getLastUpdated(client, ejerlavkode) {
    return client.queryp("select lastupdated FROM ejerlav_ts WHERE ejerlavkode = $1", [ejerlavkode]).then(function(result) {
      if(!result.rows || result.rows.length === 0) {
        return null;
      }
      return moment(result.rows[0].lastupdated).valueOf();
    });
  }

  function setLastUpdated(client, ejerlavkode, millisecondsSinceEpoch) {
    var secondsSinceEpoch = millisecondsSinceEpoch / 1000;
    return getLastUpdated(client, ejerlavkode).then(function(lastUpdated) {
      if(lastUpdated) {
        return client.queryp('UPDATE ejerlav_ts SET lastupdated = to_timestamp($2) WHERE ejerlavkode = $1', [ejerlavkode, secondsSinceEpoch]);
      }
      else {
        return client.queryp('INSERT INTO ejerlav_ts(ejerlavkode, lastupdated) VALUES ($1, to_timestamp($2))', [ejerlavkode, secondsSinceEpoch]);
      }
    });
  }

  files.map(function(file) {
    return function() {
      var stats = fs.statSync(path.join(options.sourceDir, file));
      var ctimeMillis = stats.mtime.getTime();

      atLeastOneFileProcessed = true;
      var ejerlavkode = parseEjerlavkode(file);
      return proddb.withTransaction('READ_WRITE', function (client) {
        return getLastUpdated(client, ejerlavkode).then(function (lastUpdatedMillis) {
          if (lastUpdatedMillis && lastUpdatedMillis >= ctimeMillis) {
            logger.debug('Skipping ejerlav, not modified', { ejerlavkode: ejerlavkode });
            return;
          }
          return q.nfcall(child_process.exec, "unzip -p " + file,
            {
              cwd: options.sourceDir,
              maxBuffer: 1024 * 1024 * 128
            }
          ).then(function (stdout) {
              var gml = stdout.toString('utf-8');
              // For some crazy reason, we get a single comma "," in stdout, when the
              // ZIP-file does not contain a gml file. We consider any output less than
              // 10 chars to be "no data".
              if(gml.trim().length < 10) {
                logger.error('Ejerlav fil for ejerlav ' + ejerlavkode + ' indeholdt ingen data');
              }
              else {
                return ejerlav.parseEjerlav(gml)
                  .then(function (jordstykker) {
                    jordstykker.forEach(function (jordstykke) {
                      if (jordstykke.fields.ejerlavkode !== ejerlavkode) {
                        return q.reject(new Error("Ejerlavkode for jordstykket matchede ikke ejerlavkode for filen"));
                      }
                    });
                    return ejerlav.storeEjerlav(ejerlavkode, jordstykker, client, {init: options.init});
                  }
                ).then(function() {
                    return setLastUpdated(client, ejerlavkode, ctimeMillis);
                  }
                ).then(function() {
                    logger.info('successfully updated ejerlav', {ejerlavkode: ejerlavkode});
                  });
              }
            }
          );
        });
      });
    };
  }).reduce(q.when, q([])).then(function() {
    if(atLeastOneFileProcessed) {
      return proddb.withTransaction('READ_WRITE', function(client) {
        var temaDef = tema.findTema('jordstykke');
        return tema.updateAdresserTemaerView(client, temaDef, options.init).then(() => {
          return client.queryp('REFRESH MATERIALIZED VIEW CONCURRENTLY jordstykker');
        });
      });
    }
    else {
      logger.info("Ingen opdatering af temamapninger, da ingen ejerlav er opdateret");
    }
  })
    .then(function() {
      logger.info("Indlæsning af matrikelkort afsluttet");
    }).done();
});
