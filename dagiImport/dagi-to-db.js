"use strict";

var fs = require('fs');
var path = require('path');
var _ = require('underscore');
var sqlCommon = require('../psql/common');
var xml2js = require('xml2js');
var async = require('async');
var cliParameterParsing = require('../bbr/common/cliParameterParsing');
var logger = require('../logger').forCategory('dagiToDb');

var dagiTemaer = require('../apiSpecification/temaer/temaer');
var featureMappingsNew = require('./featureMappingsNew');
var featureMappingsOld = require('./featureMappingsOld');

var featureMappingsMap = {
  oldDagi: featureMappingsOld,
  newDagi: featureMappingsNew
};

var optionSpec = {
  pgConnectionUrl: [false, 'URL som anvendes ved forbindelse til databasen', 'string'],
  dataDir: [false, 'Folder med dagitema-filer', 'string', '.'],
  filePrefix: [false, 'Prefix på dagitema-filer', 'string', ''],
  wfsSource: [false, 'WFS kilde: oldDagi eller newDagi', 'string'],
  temaer: [false, 'Inkluderede DAGI temaer, adskildt af komma','string']
};

function findTema(temaNavn) {
  return _.findWhere(dagiTemaer, { singular: temaNavn });
}

function as2DWkt(text) {
  var points = text.split(' ');
  return _.map(points,function (point) {
    var coords = point.split(',');
    return coords[0] + ' ' + coords[1];
  }).join(',');
}

function gmlPolygonToWkt(json) {
  var polygon = json.Polygon[0];
  var outerCoordsText = as2DWkt(polygon.outerBoundaryIs[0].LinearRing[0].coordinates[0]);

  var innerBoundaryIsList = polygon.innerBoundaryIs ? polygon.innerBoundaryIs : [];
  var innerCoordsTexts = _.map(_.map(innerBoundaryIsList, function (innerBoundaryIs) {
    return innerBoundaryIs.LinearRing[0].coordinates[0];
  }), as2DWkt);
  var innerCoordsText = _.reduce(innerCoordsTexts, function (memo, text) {
    return memo + ',(' + text + ')';
  }, '');
  return 'POLYGON((' + outerCoordsText + ')' + innerCoordsText + ')';
}

function removeAll(aas, bs, keyProperty) {
  return _.filter(aas, function (a) {
    return _.every(bs, function (newTema) {
      return newTema.fields[keyProperty] !== a.fields[keyProperty];
    });
  });
}

function wfsFeatureToDagi(feature, mapping) {
  var wfsFeature = feature[mapping.wfsName][0];

  var result = {
    polygon: gmlPolygonToWkt(wfsFeature[mapping.geometry][0])
  };

  result.fields = _.reduce(mapping.fields, function(memo, fieldMapping, dawaFieldName) {
    memo[dawaFieldName] = fieldMapping.parseFn(wfsFeature[fieldMapping.name][0]);
    return memo;
  }, {});
  return result;
}

cliParameterParsing.main(optionSpec, _.without(_.keys(optionSpec), 'temaer'), function (args, options) {
  var dagi = require('./dagi');

  var featureMappings = featureMappingsMap[options.wfsSource];
  if(!featureMappings) {
    throw new Error("Ugyldig værdi for parameter wfsSource");
  }

  var temaer = options.temaer ? options.temaer.split(',') : _.keys(featureMappings);

  function putDagiTemaer(temaNavn, temaer, callback) {
    var key = findTema(temaNavn).key;
    sqlCommon.withWriteTransaction(options.pgConnectionUrl, function (err, client, done) {
      if (err) {
        throw err;
      }
      dagi.getDagiTemaer(client, temaNavn, function (err, existingTemaer) {
        if (err) {
          throw err;
        }
        var temaerToRemove = removeAll(existingTemaer, temaer, key);
        var temaerToCreate = removeAll(temaer, existingTemaer, key);
        var temaerToUpdate = removeAll(temaer, temaerToCreate, key);
        async.series([
          function (callback) {
            async.eachSeries(temaerToRemove, function (tema, callback) {
              logger.info('Removing dagitema', { tema: tema.tema, fields: tema.fields });
              dagi.deleteDagiTema(client, tema, callback);
            }, callback);
          },
          function (callback) {
            async.eachSeries(temaerToCreate, function (tema, callback) {
              logger.info('Adding dagitema', { tema: tema.tema, fields: tema.fields });
              dagi.addDagiTema(client, tema, callback);
            }, callback);
          },
          function (callback) {
            async.eachSeries(temaerToUpdate, function (tema, callback) {
              logger.debug('opdaterer dagitema',{ tema: tema.tema, fields: tema.fields });
              dagi.updateDagiTema(client, tema, function(err, result) {
                if(err) {
                  return callback(err);
                }
                if(result.rowCount === 0){
                  logger.info('dagitema uændret');
                }
                else {
                  logger.info('Opdaterede dagitema', { tema: tema.tema, kode: tema.kode, navn: tema.navn });
                }
                callback(err, result);
              });
            }, callback);
          },
          function (callback) {
            done(null, callback);
          }
        ], callback);
      });
    });
  }

  function indlæsDagiTema(temaNavn, callback) {
    console.log('temaNavn: ' + temaNavn);
    var mapping = featureMappings[temaNavn];
    var key = findTema(temaNavn).key;
    logger.debug("gemmer DAGI tema  i databasen", {temaNavn: temaNavn});
    var directory = path.resolve(options.dataDir);
    var filename = options.filePrefix + temaNavn;
    var body = fs.readFileSync(path.join(directory, filename));
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
        return wfsFeatureToDagi(feature, mapping);
      });
      var dagiTemaFragmentMap = _.groupBy(dagiTemaFragments, function(fragment) {
        return fragment.fields[key];
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
          logger.error('Indlæsning af dagitema fejlet', { temaNavn: temaNavn, error: err});
        }
        else {
          logger.debug('Indlæsning af DAGI temaer afsluttet', {temaNavn: temaNavn });
        }
        callback(err);
      });
    });
  }

  async.eachSeries(temaer, function (temaNavn, callback) {
    indlæsDagiTema(temaNavn, callback);
  }, function (err) {
    if(err) {
      logger.error('Indlæsning af dagitema fejlet', err);
      process.exit(1);
    }
    else {
      logger.info('Indlæsning af dagitemaer gennemført', { temaer: options.temaer.split(',')});
    }
  });
});