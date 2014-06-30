"use strict";

var fs = require('fs');
var path = require('path');
var _ = require('underscore');
var sqlCommon = require('../psql/common');
var xml2js = require('xml2js');
var async = require('async');
var cliParameterParsing = require('../bbr/common/cliParameterParsing');

var dagiFeatureNames = {
  kommune: 'Kommuneinddeling',
  opstillingskreds: 'Opstillingskreds',
  politikreds: 'Politikreds',
  postdistrikt: 'Postnummerinddeling',
  region: 'Regionsinddeling',
  retskreds: 'Retskreds',
  sogn: 'Sogneinddeling',
  afstemningsomraade: 'Afstemningsomraade',
  storkreds: 'Storkreds',
  danmark: 'Danmark',
  menighedsraadsafstemningsomraade: 'Menighedsraadsafstemningsomraade',
  valglandsdel: 'Valglandsdel',
  samlepostnummer: 'Samlepostnummer',
  supplerendebynavn: 'SupplerendeBynavn'
};

var dagiKodeKolonne = {
  kommune: 'kommunekode',
  region: 'regionskode',
  sogn: 'sognekode',
  opstillingskreds: 'Opstillingskredsnummer',
  politikreds: 'myndighedskode',
  postdistrikt: 'postnummer',
  retskreds: 'myndighedskode'
};

var dagiNavnKolonne = {
  kommune: 'navn',
  region: 'navn',
  sogn: 'navn',
  opstillingskreds: 'navn',
  politikreds: 'navn',
  postdistrikt: 'navn',
  retskreds: 'navn'
};


var optionSpec = {
  pgConnectionUrl: [false, 'URL som anvendes ved forbindelse til databasen', 'string'],
  dataDir: [false, 'Folder med dagitema-filer', 'string', '.'],
  filePrefix: [false, 'Prefix på dagitema-filer', 'string', ''],
  temaer: [false, 'Inkluderede DAGI temaer, adskildt af komma','string', _.keys(dagiNavnKolonne).join(',')]
};

cliParameterParsing.main(optionSpec, _.keys(optionSpec), function (args, options) {
  var dagi = require('./dagi');



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

  function removeAll(as, bs) {
    return _.filter(as, function (a) {
      return _.every(bs, function (newTema) {
        return newTema.kode !== a.kode;
      });
    });
  }

  function putDagiTemaer(temaNavn, temaer, callback) {
    sqlCommon.withWriteTransaction(options.pgConnectionUrl, function (err, client, done) {
      if (err) {
        throw err;
      }
      dagi.getDagiTemaer(client, temaNavn, function (err, existingTemaer) {
        if (err) {
          throw err;
        }
        var temaerToRemove = removeAll(existingTemaer, temaer);
        var temaerToCreate = removeAll(temaer, existingTemaer);
        var temaerToUpdate = removeAll(temaer, temaerToCreate);
        async.series([
          function (callback) {
            async.eachSeries(temaerToRemove, function (tema, callback) {
              console.log('removing: ' + JSON.stringify({ tema: tema.tema, kode: tema.kode, navn: tema.navn }));
              dagi.deleteDagiTema(client, tema, callback);
            }, callback);
          },
          function (callback) {
            async.eachSeries(temaerToCreate, function (tema, callback) {
              console.log('adding: ' + JSON.stringify({ tema: tema.tema, kode: tema.kode, navn: tema.navn }));
              dagi.addDagiTema(client, tema, callback);
            }, callback);
          },
          function (callback) {
            async.eachSeries(temaerToUpdate, function (tema, callback) {
              console.log('updating: ' + JSON.stringify({ tema: tema.tema, kode: tema.kode, navn: tema.navn }));
              dagi.updateDagiTema(client, tema, callback);
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
    console.log("gemmer DAGI tema " + temaNavn + ' i databasen');
    var directory = path.resolve(options.dataDir);
    var filename = options.filePrefix + temaNavn;
    var body = fs.readFileSync(path.join(directory, filename));
    xml2js.parseString(body, {
      tagNameProcessors: [xml2js.processors.stripPrefix],
      trim: true
    }, function (err, result) {
      if (err) {
        throw err;
      }
      if (!result.FeatureCollection) {
        throw 'Unexpected result from DAGI: ' + JSON.stringify(result);
      }
      var features = result.FeatureCollection.featureMember;
      var dagiTemaFragments = _.map(features, function (feature) {
        var f = feature[dagiFeatureNames[temaNavn]][0];
        return {
          tema: temaNavn,
          kode: parseInt(f[dagiKodeKolonne[temaNavn]][0], 10),
          navn: dagiNavnKolonne[temaNavn] ? f[dagiNavnKolonne[temaNavn]][0] : null,
          polygon: gmlPolygonToWkt(f.geometri[0])
        };
      });
      var dagiTemaFragmentMap = _.groupBy(dagiTemaFragments, 'kode');
      dagiTemaFragments = null;
      var dagiTemaer = _.map(dagiTemaFragmentMap, function (fragments) {
        var polygons = _.pluck(fragments, 'polygon');
        return  {
          tema: temaNavn,
          kode: fragments[0].kode,
          navn: fragments[0].navn,
          polygons: polygons
        };
      });
      dagiTemaFragmentMap = null;
      putDagiTemaer(temaNavn, dagiTemaer, function (err) {
        console.log('put dagi temaer complete: ' + err);
        callback(err);
      });
    });
  }

  async.eachSeries(options.temaer.split(','), function (temaNavn, callback) {
    indlæsDagiTema(temaNavn, callback);
  }, function (err) {
    if (err) {
      throw err;
    }
  });
});