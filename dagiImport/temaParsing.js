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

const wfsFeatureToTema2 =  (feature, mapping) => {
  const featureCandidates = feature[mapping.wfsName];
  if (!featureCandidates) {
    logger.error("found no features, feature[" + mapping.wfsName + "], feature = ", JSON.stringify(feature));
  }
  const wfsFeature = featureCandidates[0];

  const builder = new xml2js.Builder({renderOpts: {pretty: false}, headless: true});
  const geometryRoot = (wfsFeature.surfaceProperty || wfsFeature.multiSurfaceProperty || wfsFeature.geometri)[0];
  const rootElmName = Object.keys(geometryRoot);
  const rootElm = {};
  rootElm[rootElmName] = geometryRoot[rootElmName][0];
  const geom = builder.buildObject(rootElm);
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
    if(fieldMapping.parseXml) {
      memo[fieldName] = fieldMapping.parseXml(objWithProperty[fieldMapping.name][0]);
    }
    else {
      memo[fieldName] = fieldMapping.parseFn(objWithProperty[fieldMapping.name][0]);
    }
    return memo;
  }, {});

  return Object.assign({geom}, fields);
};

const gmlToJson = gmlText => go(function*() {
  const result =  yield q.nfcall(xml2js.parseString, gmlText, {
    tagNameProcessors: [xml2js.processors.stripPrefix],
    trim: true
  });
  if (!result.FeatureCollection) {
    throw new Error('Unexpected contents in tema file file: ' + JSON.stringify(result));
  }
  return result;
});

const extractFeatures = (json, mapping) =>  {
  let features = json.FeatureCollection.member || json.FeatureCollection.featureMember;
  features = features.filter(feature => feature[mapping.wfsName]);
  features = features.filter(mapping.filterFn);
  // old school loop to conserve some memory
  for(let i = 0; i < features.length; ++i){
    features[i] = wfsFeatureToTema2(features[i], mapping);
  }
  return features;
};

const parseTemaGml = (gmlText, mapping) => go(function*() {
  const result = yield gmlToJson(gmlText);
  let features = result.FeatureCollection.featureMember;
  features = features.filter(feature => feature[mapping.wfsName]);
  features = features.filter(mapping.filterFn);
  // old school loop to conserve some memory
  for(let i = 0; i < features.length; ++i){
    features[i] = wfsFeatureToTema(features[i], mapping);
  }
  return features;

});

const parseTemaGml2 = (gmlText, mapping) => go(function*() {
  const json = yield gmlToJson(gmlText);
  return extractFeatures(json, mapping);
});

module.exports = { parseTemaGml,parseTemaGml2, gmlToJson, extractFeatures};

