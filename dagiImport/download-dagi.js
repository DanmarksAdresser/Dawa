"use strict";

const q = require('q');
const { go } = require('ts-csp');
var request = require('request-promise');
var _ = require('underscore');
var fs = require('fs');
var path = require('path');
var async = require('async');
var xml2js = require('xml2js');
var logger = require('../logger');

const { runImporter } = require('../importUtil/runImporter');

var wfsServices = {
  newDagi: {
    defaultUrl: 'http://kortforsyningen.kms.dk/DAGI_SINGLEGEOM_GML2_v2?',
    loginRequired: true,
    loginParam: 'login',
    defaultLogin: 'dawa',
    wfsVersion: '1.0.0',
    featureNames: {
      storkreds: 'Storkreds',
      valglandsdel: 'Valglandsdel',
    }
  },
  zone: {
    wfsVersion: '1.0.0',
    loginRequired: false,
    defaultUrl: 'http://geoservice.plansystem.dk/wfs?',
    featureNames: {
      zone: "pdk:theme_pdk_zonekort_v"
    }
  },
  datafordeler: {
    wfsVersion: '2.0.0',
    defaultUrl: "https://services.datafordeler.dk/DAGIM/DAGI_10MULTIGEOM_GMLSFP/1.0.0/WFS?",
    loginRequired: true,
    loginParam: 'username',
    defaultLogin: 'ZJJLGHLNTT',
    featureNames: {
      kommune: 'Kommuneinddeling',
      opstillingskreds: 'Opstillingskreds',
      politikreds: 'Politikreds',
      postnummer: 'Postnummerinddeling',
      region: 'Regionsinddeling',
      retskreds: 'Retskreds',
      sogn: 'Sogneinddeling',
      afstemningsområde: 'Afstemningsomraade',
      // storkreds: 'Storkreds',
      danmark: 'Danmark',
      menighedsrådsafstemningsområde: 'Menighedsraadsafstemningsomraade',
      // valglandsdel: 'Valglandsdel',
      samlepostnummer: 'Samlepostnummer',
      supplerendebynavn: 'SupplerendeBynavn'
    }
  }
};
var optionSpec = {
  targetDir: [false, 'Folder hvor DAGI-temaerne gemmes', 'string', '.'],
  filePrefix: [false, 'Prefix, som tilføjes filerne med de gemte DAGI-temaer', 'string', ''],
  dagiUrl: [false, 'URL til webservice hvor DAGI temaerne hentes fra', 'string'],
  dagiLogin: [false, 'Brugernavn til webservicen hvor DAGI temaerne hentes fra', 'string'],
  dagiPassword: [false, 'Password til webservicen hvor DAGI temaerne hentes fra', 'string'],
  retries: [false, 'Antal forsøg på kald til WFS service før der gives op', 'number', 5],
  temaer: [false, 'Inkluderede DAGI temaer, adskilt af komma','string'],
  service: [false, 'Angiver, om der anvendes ny eller gammel service (zone, oldDagi eller newDagi)', 'string']
};

runImporter('download-dagi', optionSpec, ['service'], function (args, options) {
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
    logger.info("downloadDagi", "Downloader DAGI tema " + temaNavn);
    var queryParams = {
      SERVICE: 'WFS',
      VERSION: serviceSpec.wfsVersion,
      REQUEST: 'GetFeature',
    };
    const typenameParamName = serviceSpec.wfsVersion === '2.0.0' ? 'TYPENAMES' : 'TYPENAME';
    queryParams[typenameParamName] =  featureNames[temaNavn];

    if(serviceSpec.loginRequired){
      _.extend(queryParams, {
        password: dagiPassword
      });
      queryParams[serviceSpec.loginParam] = dagiLogin;
    }
    var paramString = _.map(queryParams,function (value, name) {
      return name + '=' + encodeURIComponent(value);
    }).join('&');
    var url = dagiUrl + '&' + paramString;
    logger.info("downloadDagi", "fetching from WFS", { url: url});
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

  return go(function*() {
    for(let temaNavn of featuresToDownload) {
      yield q.nfcall(saveDagiTema, temaNavn);

    }
  });
});
