"use strict";
const gml = require('./gml');
const q = require('q');
const xml2js = require('xml2js');
const _ = require("underscore");

const { go } = require('ts-csp');

const logger = require('../logger').forCategory('dagiImport');

const wfsFeatureToTema =  (feature, mapping) => {
  const featureCandidates = feature[mapping.wfsName];
  if (!featureCandidates) {
    logger.error("found no features, feature[" + mapping.wfsName + "], feature = ", JSON.stringify(feature));
  }
  const wfsFeature = featureCandidates[0];

  const geom = 'SRID=25832;' + gml.gmlGeometryToWkt(wfsFeature[mapping.geometry][0]);
  const fields = _.reduce(mapping.fields, function (memo, fieldMapping, fieldName) {
    let objWithProperty;
    if (fieldMapping.path) {
      objWithProperty = _.reduce(fieldMapping.path, function (memo, pathSegment) {
        if (!memo || !memo[pathSegment]) {
          return null;
        }
        return memo[pathSegment][0];
      }, wfsFeature);
    }
    else {
      objWithProperty = wfsFeature;
    }
    memo[fieldName] = fieldMapping.parseFn(objWithProperty[fieldMapping.name][0]);
    return memo;
  }, {});

  return Object.assign({geom}, fields);
};



const parseTemaGml = (gmlText, mapping) => go(function*() {
  const result =  yield q.nfcall(xml2js.parseString, gmlText, {
    tagNameProcessors: [xml2js.processors.stripPrefix],
    trim: true
  });

  if (!result.FeatureCollection) {
    throw new Error('Unexpected contents in tema file file: ' + JSON.stringify(result));
  }

  const features = result.FeatureCollection.featureMember;

  return _.chain(features)
    .filter(function (feature) {
      // Some files may contain feature types we dont want (e.g. ejerlav).
      return feature[mapping.wfsName];
    })
    .filter(mapping.filterFn)
    .map((feature) =>  wfsFeatureToTema(feature, mapping))
    .value();

});

module.exports = { parseTemaGml};

