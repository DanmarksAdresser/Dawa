"use strict";

var request = require('request');
var _ = require('underscore');
var xml2js = require('xml2js');
var async = require('async');
var cli = require('cli');
var cliParameterParsing = require('../bbr/common/cliParameterParsing');

var optionSpec = {
  pgConnectionUrl: [false, 'URL som anvendes ved forbindelse til databasen', 'string'],
  dagiUrl: [false, 'URL til webservice hvor DAGI temaerne hentes fra', 'string', 'http://kortforsyningen.kms.dk/service?servicename=dagi_gml2'],
  dagiLogin: [false, 'Brugernavn til webservicen hvor DAGI temaerne hentes fra', 'string', 'dawa'],
  dagiPassword: [false, 'Password til webservicen hvor DAGI temaerne hentes fra', 'string']
};
cli.parse(optionSpec, []);

cli.main(function (args, options) {
  cliParameterParsing.addEnvironmentOptions(optionSpec, options);
  process.env.pgConnectionUrl = options.pgConnectionUrl;

  cliParameterParsing.checkRequiredOptions(options, _.keys(optionSpec));

  // we need to set the pgConnectionUrl before importing these. TODO That should be fixed.
  var dagi = require('./dagi');
  var dbapi = require('./../dbapi');

  var dagiUrl = options.dagiUrl || 'http://kortforsyningen.kms.dk/service?servicename=dagi_gml2';
  var dagiLogin = options.dagiLogin || 'dawa';
  var dagiPassword = options.dagiPassword;

  var dagiFeatureNames = {
    kommune: 'KOMMUNE10',
    opstillingskreds: 'OPSTILLINGSKREDS10',
    politikreds: 'POLITIKREDS10',
    postdistrikt: 'POSTDISTRIKT10',
    region: 'REGION10',
    retskreds: 'RETSKREDS10',
    sogn: 'SOGN10'
  };

  var dagiKodeKolonne = {
    kommune: 'CPR_noegle',
    region: 'CPR_noegle',
    sogn: 'CPR_noegle',
    opstillingskreds: 'Opstillingskredsnummer',
    politikreds: 'CPR_noegle',
    postdistrikt: 'PostCodeLabelText',
    retskreds: 'CPR_noegle'
  };

  var dagiNavnKolonne = {
    kommune: 'Navn',
    region: 'Navn',
    sogn: 'Navn',
    opstillingskreds: 'Navn',
    politikreds: 'Navn',
    postdistrikt: null,
    retskreds: 'Navn'
  };

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
    dbapi.withWriteTransaction(function (err, client, done) {
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
    console.log("Indlæser DAGI tema " + temaNavn);
    var queryParams = {
      login: dagiLogin,
      password: dagiPassword,
      SERVICE: 'WFS',
      VERSION: '1.0.0',
      REQUEST: 'GetFeature',
      TYPENAME: dagiFeatureNames[temaNavn]
    };
    var paramString = _.map(queryParams,function (value, name) {
      return name + '=' + encodeURIComponent(value);
    }).join('&');
    var url = dagiUrl + '&' + paramString;
    console.log("URL: " + url);
    request.get(url, function (err, response, body) {
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
    });
  }

  async.eachSeries(_.keys(dagiFeatureNames), function (temaNavn, callback) {
    indlæsDagiTema(temaNavn, callback);
  }, function (err) {
    if (err) {
      throw err;
    }
  });
});