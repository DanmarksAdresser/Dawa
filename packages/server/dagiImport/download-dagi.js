#!/usr/bin/env node
"use strict";

const Promise = require('bluebird');
const {go} = require('ts-csp');
var request = require('request-promise');
var _ = require('underscore');
var fs = require('fs');
var path = require('path');
var xml2js = require('xml2js');
var logger = require('@dawadk/common/src/logger');

const runConfigured = require('@dawadk/common/src/cli/run-configured');

var wfsServices = {
  zone: {
    wfsVersion: '1.0.0',
    loginRequired: false,
    defaultUrl: 'https://geoserver.plandata.dk/geoserver/wfs?',
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
      danmark: 'Danmark',
      menighedsrådsafstemningsområde: 'Menighedsraadsafstemningsomraade',
      samlepostnummer: 'Samlepostnummer',
      supplerendebynavn: 'SupplerendeBynavn',
      landsdel: 'Landsdel'

    }
  }
};
const schema = {
  target_dir: {
    doc: 'Directory where files are saved to',
    format: 'string',
    default: '.',
    cli: true
  },
  file_prefix: {
    doc: 'Prefix added to the files saved',
    format: 'string',
    default: '',
    cli: true
  },
  service: {
    doc: 'Specifies which WFS to download from (either datafordeler or zone)',
    format: 'string',
    cli: true,
    default: null,
    required: true
  },
  service_url: {
    doc: 'URL to WFS service to download from',
    format: 'string',
    cli: true,
    default: null
  },
  service_login: {
    doc: 'Username for logging into service',
    format: 'string',
    cli: true,
    default: null
  },
  service_password: {
    doc: 'Password for logging into service',
    format: 'string',
    sensitive: true,
    cli: true,
    default: null
  },
  retries: {
    doc: 'Number of retries when calling WFS service',
    format: 'nat',
    default: 5,
    cli: true
  },
  themes: {
    doc: 'Which themes to download from service in comma-separated list (defaults to all supported)',
    format: 'string',
    default: null,
    cli: true
  }
};

runConfigured(schema, [], config => go(function* () {

  var serviceSpec = wfsServices[config.get('service')];

  if (!serviceSpec) {
    throw new Error('ugyldig service parameter');
  }

  var dagiUrl = config.get('service_url') || serviceSpec.defaultUrl;
  var dagiLogin = config.get('service_login') || serviceSpec.defaultLogin;
  var dagiPassword = config.get('service_password');

  if (serviceSpec.loginRequired && !dagiPassword) {
    throw new Error("Intet kodeord angivet");
  }

  var featureNames = serviceSpec.featureNames;

  var featuresToDownload = config.get('themes') ? config.get('themes').split(',') : _.keys(serviceSpec.featureNames);

  var directory = path.resolve(config.get('target_dir'));

  const saveDagiTema = temaNavn => go(function* () {
    logger.info("downloadDagi", "Downloader DAGI tema " + temaNavn);
    const queryParams = {
      SERVICE: 'WFS',
      VERSION: serviceSpec.wfsVersion,
      REQUEST: 'GetFeature',
    };
    const typenameParamName = serviceSpec.wfsVersion === '2.0.0' ? 'TYPENAMES' : 'TYPENAME';
    queryParams[typenameParamName] = featureNames[temaNavn];

    if (serviceSpec.loginRequired) {
      _.extend(queryParams, {
        password: dagiPassword
      });
      queryParams[serviceSpec.loginParam] = dagiLogin;
    }
    const paramString = _.map(queryParams, function (value, name) {
      return name + '=' + encodeURIComponent(value);
    }).join('&');
    const url = dagiUrl + '&' + paramString;
    logger.info("downloadDagi", "fetching from WFS", {url: url});

    const getDagiTema = () => go(function* () {
      const response = yield request.get({url, resolveWithFullResponse: true});
      const body = response.body;
      if (response.statusCode >= 300) {
        throw new Error('Unexpected status code from WFS service: ' + response.statusCode + ' response: ' + body);
      }
      const parsedXml = yield Promise.promisify(xml2js.parseString)(body, {
        tagNameProcessors: [xml2js.processors.stripPrefix],
        trim: true
      });
      if(!parsedXml.FeatureCollection) {
        throw new Error('Unexpected response content from WFS service.', {
          truncatedResponse: body.substring(0, 100)
        });
      }
      return body;
    });

    const getDagiTemaWithRetry = () => go(function* () {
      const retries = config.get('retries');
      for (let i = 0; i < retries; ++i) {
        try {
          return yield getDagiTema();
        } catch (e) {
          logger.error('downloadDagi', 'Failed to get tema from WFS service', e);
        }
      }
      throw new Error('No more retries, aborting');
    });

    const temaXml = yield getDagiTemaWithRetry();
    const filename = config.get('file_prefix') + temaNavn;
    yield Promise.promisify(fs.writeFile)(path.join(directory, filename), temaXml);
  });

  for (let temaNavn of featuresToDownload) {
    yield saveDagiTema(temaNavn);
  }
}));
