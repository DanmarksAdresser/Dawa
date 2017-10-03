"use strict";

var fs = require('fs');
var path = require('path');
var _ = require('underscore');
const { go } = require('ts-csp');
const { runImporter } = require('../importUtil/runImporter');
var logger = require('../logger').forCategory('dagiToDb');

var dagiTemaer = require('../temaer/tema');
var featureMappingsNew = require('./featureMappingsNew');
var featureMappingsOld = require('./featureMappingsOld');
var proddb = require('../psql/proddb');

function parseInteger(str) {
  return parseInt(str, 10);
}

var featureMappingsMap = {
  oldDagi: featureMappingsOld,
  newDagi: featureMappingsNew,
  zone: {
    zone: {
      name: 'theme_pdk_zonekort_v',
      wfsName: 'theme_pdk_zonekort_v',
      geometry: 'geometri',
      fields: {
        zone: {
          name: 'zone',
          parseFn: parseInteger
        }
      },
      filterFn: function() { return true; }
    }
  }
};

var optionSpec = {
  pgConnectionUrl: [false, 'URL som anvendes ved forbindelse til databasen', 'string'],
  dataDir: [false, 'Folder med DAGI tema-filer', 'string', '.'],
  filePrefix: [false, 'Prefix på DAGI tema-filer', 'string', ''],
  service: [false, 'WFS kilde: oldDagi eller newDagi', 'string'],
  temaer: [false, 'Inkluderede DAGI temaer, adskilt af komma','string'],
  init: [false, 'Initialiserende indlæsning - KUN FØRSTE GANG', 'boolean', false],
  maxChanges: [false, 'Maximalt antal ændringer der udføres på adressetilknytninger (pr. tema)', 'number', 10000]
};

runImporter('dagi-to-db', optionSpec, _.without(_.keys(optionSpec), 'temaer'), function (args, options) {
  proddb.init({
    connString: options.pgConnectionUrl,
    pooled: false
  });
  var tema = require('./../temaer/tema'); // needs to be required after the parameterParsing has setup the pgConnectionUrl

  var featureMappings = featureMappingsMap[options.service];
  if(!featureMappings) {
    throw new Error("Ugyldig værdi for parameter service");
  }

  var temaer = options.temaer ? options.temaer.split(',') : _.keys(featureMappings);

  function putDagiTemaer(temaNavn, temaer, maxChanges) {
    return proddb.withTransaction('READ_WRITE', function(client) {
      return tema.putTemaer(dagiTemaer.findTema(temaNavn), temaer, client, options.init, {}, true, maxChanges);
    });
  }

  function indlaesDagiTema(temaNavn, maxChanges) {
    logger.info('Indlæser DAGI tema ' + temaNavn);
    var mapping = featureMappings[temaNavn];
    if(!mapping) {
      throw new Error('Tema ' + temaNavn + ' ikke specificeret for den angivne service');
    }
    var temaDef = dagiTemaer.findTema(temaNavn);
    var directory = path.resolve(options.dataDir);
    var filename = options.filePrefix + temaNavn;
    var body = fs.readFileSync(path.join(directory, filename));
    return tema.parseTemaer(body, temaDef, mapping).then(function(temaer) {
      return putDagiTemaer(temaNavn, temaer, maxChanges);
    });
  }

  return go(function*() {
    for(let temaNavn of temaer) {
      try {
        yield indlaesDagiTema(temaNavn, options.maxChanges);
      }
      catch(err) {
        logger.error('Indlæsning af DAGI tema fejlet', {
          temaNavn,
          error: err
        });
        throw err;
      }
    }
    logger.info('Indlæsning af DAGI temaer gennemført', { temaer: temaer});
  });
});
