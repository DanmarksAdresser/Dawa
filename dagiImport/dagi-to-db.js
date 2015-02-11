"use strict";

var fs = require('fs');
var path = require('path');
var _ = require('underscore');
var xml2js = require('xml2js');
var async = require('async');
var cliParameterParsing = require('../bbr/common/cliParameterParsing');
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
      }
    }
  }
};

var optionSpec = {
  pgConnectionUrl: [false, 'URL som anvendes ved forbindelse til databasen', 'string'],
  dataDir: [false, 'Folder med DAGI tema-filer', 'string', '.'],
  filePrefix: [false, 'Prefix på DAGI tema-filer', 'string', ''],
  service: [false, 'WFS kilde: oldDagi eller newDagi', 'string'],
  temaer: [false, 'Inkluderede DAGI temaer, adskilt af komma','string'],
  init: [false, 'Initialiserende indlæsning - KUN FØRSTE GANG', 'boolean', false]
};

cliParameterParsing.main(optionSpec, _.without(_.keys(optionSpec), 'temaer'), function (args, options) {
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

  function putDagiTemaer(temaNavn, temaer, callback) {
    return proddb.withTransaction('READ_WRITE', function(client) {
      return tema.putTemaer(dagiTemaer.findTema(temaNavn), temaer, client, options.init, {});
    }).nodeify(callback);
  }

  function indlaesDagiTema(temaNavn, callback) {
    console.log('temaNavn: ' + temaNavn);
    var mapping = featureMappings[temaNavn];
    if(!mapping) {
      throw new Error('Tema ' + temaNavn + ' ikke specificeret for den angivne service');
    }
    var temaDef = dagiTemaer.findTema(temaNavn);
    var directory = path.resolve(options.dataDir);
    var filename = options.filePrefix + temaNavn;
    /*jslint stupid: true */ // allows the readFileSync call
    var body = fs.readFileSync(path.join(directory, filename));
    /*jslint stupid: false */
    xml2js.parseString(body, {
      tagNameProcessors: [xml2js.processors.stripPrefix],
      trim: true
    }, function (err, result) {
      if (err) {
        return callback(err);
      }
      if (!result.FeatureCollection) {
        return callback(new Error('Unexpected result from DAGI: ' + JSON.stringify(result)));
      }
      var features = result.FeatureCollection.featureMember;
      var dagiTemaFragments = _.map(features, function (feature) {
        return tema.wfsFeatureToTema(feature, mapping);
      });
      var dagiTemaFragmentMap = _.groupBy(dagiTemaFragments, function(fragment) {
        return tema.stringKey(fragment, temaDef);
      });
      dagiTemaFragments = null;
      var dagiTemaer = _.map(dagiTemaFragmentMap, function (fragments) {
        var polygons = _.pluck(fragments, 'polygon');
        return  {
          tema: temaNavn,
          fields: fragments[0].fields,
          polygons: polygons
        };
      });
      dagiTemaFragmentMap = null;
      putDagiTemaer(temaNavn, dagiTemaer, function (err) {
        if(err) {
          logger.error('Indlæsning af DAGI tema fejlet', { temaNavn: temaNavn, error: err});
        }
        else {
          logger.debug('Indlæsning af DAGI temaer afsluttet', {temaNavn: temaNavn });
        }
        callback(err);
      });
    });
  }

  async.eachSeries(temaer, function (temaNavn, callback) {
    indlaesDagiTema(temaNavn, callback);
  }, function (err) {
    if(err) {
      logger.error('Indlæsning af DAGI tema fejlet', err);
      process.exit(1);
    }
    else {
      logger.info('Indlæsning af DAGI temaer gennemført', { temaer: temaer});
    }
  });
});