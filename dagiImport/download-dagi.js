"use strict";

var request = require('request');
var _ = require('underscore');
var fs = require('fs');
var path = require('path');
var async = require('async');
var xml2js = require('xml2js');
var logger = require('../logger');

var cliParameterParsing = require('../bbr/common/cliParameterParsing');

var wfsServices = {
  newDagi: {
    defaultUrl: 'http://kortforsyningen.kms.dk/DAGI_SINGLEGEOM_GML2?',
    loginRequired: true,
    defaultLogin: 'dawa',
    featureNames: {
      kommune: 'Kommuneinddeling',
      opstillingskreds: 'Opstillingskreds',
      politikreds: 'Politikreds',
      postnummer: 'Postnummerinddeling',
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
    }
  },
  oldDagi: {
    defaultUrl: 'http://kortforsyningen.kms.dk/service?servicename=dagi_gml2',
    loginRequired: true,
    defaultLogin: 'dawa',
    featureNames: {
      kommune: 'KOMMUNE10',
      opstillingskreds: 'OPSTILLINGSKREDS10',
      politikreds: 'POLITIKREDS10',
      postnummer: 'POSTDISTRIKT10',
      region: 'REGION10',
      retskreds: 'RETSKREDS10',
      sogn: 'SOGN10'
    }
  },
  zone: {
    loginRequired: false,
    defaultUrl: 'http://geoservice.plansystem.dk/wfs?',
    featureNames: {
      zone: "pdk:theme_pdk_zonekort_v"
    }
  }
};
var optionSpec = {
  targetDir: [false, 'Folder hvor DAGI-temaerne gemmes', 'string', '.'],
  filePrefix: [false, 'Prefix, som tilføjes filerne med de gemte DAGI-temaer', 'string', ''],
  dagiUrl: [false, 'URL til webservice hvor DAGI temaerne hentes fra', 'string'],
  dagiLogin: [false, 'Brugernavn til webservicen hvor DAGI temaerne hentes fra', 'string', 'dawa'],
  dagiPassword: [false, 'Password til webservicen hvor DAGI temaerne hentes fra', 'string'],
  retries: [false, 'Antal forsøg på kald til WFS service før der gives op', 'number', 5],
  temaer: [false, 'Inkluderede DAGI temaer, adskilt af komma','string'],
  service: [false, 'Angiver, om der anvendes ny eller gammel service (zone, oldDagi eller newDagi)', 'string']
};

cliParameterParsing.main(optionSpec, ['service'], function (args, options) {
  process.env.pgConnectionUrl = options.pgConnectionUrl;

  var serviceSpec = wfsServices[options.service];

  if(!serviceSpec) {
    throw new Error('ugyldig service parameter');
  }

  var dagiUrl = options.dagiUrl || serviceSpec.defaultUrl;
  var dagiLogin = options.dagiLogin || serviceSpec.defaultLogin;
  var dagiPassword = options.dagiPassword;

  if(serviceSpec.loginRequired && !dagiPassword) {
    throw new Error("Intet kodeord angivet");
  }

  var featureNames = serviceSpec.featureNames;

  var featuresToDownload = options.temaer ? options.temaer.split(',') : _.keys(serviceSpec.featureNames);

  var directory = path.resolve(options.targetDir);

  function saveDagiTema(temaNavn, callback) {
    console.log("Downloader DAGI tema " + temaNavn);
    var queryParams = {
      SERVICE: 'WFS',
      VERSION: '1.0.0',
      REQUEST: 'GetFeature',
      TYPENAME: featureNames[temaNavn]
    };
    if(serviceSpec.loginRequired){
      _.extend(queryParams, {
        login: dagiLogin,
        password: dagiPassword
      });
    }
    var paramString = _.map(queryParams,function (value, name) {
      return name + '=' + encodeURIComponent(value);
    }).join('&');
    var url = dagiUrl + '&' + paramString;
    console.log("URL: " + url);
    function getDagiTema( callback) {
      request.get(url, function (err, response, body) {
        if (err) {
          return callback(err);
        }
        if (response.statusCode >= 300) {
          return callback(new Error('Unexpected status code from WFS service: ' + response.statusCode + ' response: ' + body));
        }
        xml2js.parseString(body, {
          tagNameProcessors: [xml2js.processors.stripPrefix],
          trim: true
        }, function (err) {
          if (err) {
            return callback(err);
          }
          callback(null, body);
        });
      });
    }
    async.retry(options.retries, getDagiTema, function(err, temaXml) {
      if(err) {
        return callback(err);
      }
      var filename = options.filePrefix + temaNavn;
      fs.writeFile(path.join(directory, filename), temaXml, callback);
    });
  }

  async.eachSeries(featuresToDownload, function (temaNavn, callback) {
    saveDagiTema(temaNavn, callback);
  }, function (err) {
    if(err) {
      logger.error('downloadDagi', 'Fejl ved download af DAGI temaer', err);
      process.exit(1);
    }
    logger.info('downloadDagi', 'download af dagi temaer afsluttet');
  });
});