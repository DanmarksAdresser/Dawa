"use strict";

var request = require('request');
var _ = require('underscore');
var fs = require('fs');
var path = require('path');
var async = require('async');
var xml2js = require('xml2js');
var logger = require('../logger');

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
var optionSpec = {
  targetDir: [false, 'Folder hvor DAGI-temaerne gemmes', 'string', '.'],
  filePrefix: [false, 'Prefix, som tilføjes filerne med de gemte DAGI-temaer', 'string', ''],
  dagiUrl: [false, 'URL til webservice hvor DAGI temaerne hentes fra', 'string', 'http://kortforsyningen.kms.dk/DAGI_SINGLEGEOM_GML2?'],
  dagiLogin: [false, 'Brugernavn til webservicen hvor DAGI temaerne hentes fra', 'string', 'dawa'],
  dagiPassword: [false, 'Password til webservicen hvor DAGI temaerne hentes fra', 'string'],
  temaer: [false, 'Inkluderede DAGI temaer, adskildt af komma','string', _.keys(dagiFeatureNames).join(',')]

};

cliParameterParsing.main(optionSpec, _.keys(optionSpec), function (args, options) {
  process.env.pgConnectionUrl = options.pgConnectionUrl;

  var dagiUrl = options.dagiUrl;
  var dagiLogin = options.dagiLogin;
  var dagiPassword = options.dagiPassword;


  var directory = path.resolve(options.targetDir);

  function saveDagiTema(temaNavn, callback) {
    console.log("Downloader DAGI tema " + temaNavn);
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
      if(err) {
        return callback(err);
      }
      if(response.statusCode >= 300) {
        return callback(new Error('Unexpected status code from WFS service: ' + response.statusCode + ' response: ' + body));
      }
      xml2js.parseString(body, {
        tagNameProcessors: [xml2js.processors.stripPrefix],
        trim: true
      }, function (err) {
        if(err) {
          return callback(err);
        }
        var filename = options.filePrefix + temaNavn;
        fs.writeFile(path.join(directory, filename), body, callback);
      });
    });
  }

  async.eachSeries(_.keys(dagiFeatureNames), function (temaNavn, callback) {
    saveDagiTema(temaNavn, callback);
  }, function (err) {
    if(err) {
      logger.error('downloadDagi', 'Fejl ved download af DAGI temaer', err);
      process.exit(1);
    }
    logger.info('downloadDagi', 'download af dagi temaer afsluttet');
  });
});