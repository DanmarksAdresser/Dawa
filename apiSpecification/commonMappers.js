"use strict";

var util = require('./util');
var paths = require('./paths');
var _ = require('underscore');

var kode4String = util.kode4String;
var notNull= util.notNull;
/*
 * Utility functions
 */
exports.makeHrefFromPath = function(baseUrl, path, idArray) {
  return baseUrl +'/' + path + '/' + idArray.join('/');
};

exports.makeHref = function(baseUrl, resourceName, idArray) {
  return paths.getByKey(baseUrl, resourceName, idArray);
};

exports.mapKommuneRef = function(dbJson, baseUrl) {
  if(dbJson) {
    return {
      href: exports.makeHref(baseUrl, 'kommune', [dbJson.kode]),
      kode: kode4String(dbJson.kode),
      navn: dbJson.navn
    };
  }
  return null;
};

exports.mapKommuneRefArray = function(array, baseUrl) {
  return _.map(array.filter(function(kommune) { return notNull(kommune.kode); }), function(kommune) { return exports.mapKommuneRef(kommune, baseUrl); });
};


exports.mapPostnummerRefArray = function(array, baseUrl) {
  return _.map(array.filter(function(postnr) { return notNull(postnr.nr); }), function(postnummer) { return exports.mapPostnummerRef(postnummer, baseUrl); });
};

exports.mapPostnummerRef = function(dbJson, baseUrl) {
  if(dbJson) {
    return {
      href: exports.makeHref(baseUrl, 'postnummer', [dbJson.nr]),
      nr: kode4String(dbJson.nr),
      navn: dbJson.navn
    };
  }
  return null;
};

exports.dagiTemaJsonMapper = function(path) {
  return function (row, options) {
    return {
      href: exports.makeHrefFromPath(options.baseUrl, path, [row.kode]),
      kode: kode4String(row.kode),
      navn: row.navn
    };
  };
};