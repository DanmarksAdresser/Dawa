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
    const formattedKode = kode4String(dbJson.kode);
    return {
      href: exports.makeHref(baseUrl, 'kommune', [formattedKode]),
      kode: formattedKode,
      navn: dbJson.navn
    };
  }
  return null;
};

exports.mapKode4NavnTema = function(temaNavn, kode, navn, baseUrl) {
  if (kode) {
    return {
      href: exports.makeHref(baseUrl, temaNavn, [kode]),
      kode: kode4String(kode),
      navn: navn
    };
  }
  return null;
};

exports.mapKode4NavnTemaNoName = function(temaNavn, kode, baseUrl) {
  if (kode) {
    return {
      href: exports.makeHref(baseUrl, temaNavn, [kode]),
      kode: kode4String(kode)
    };
  }
  return null;
};

exports.mapEjerlavRef = function(kode, navn, baseUrl) {
  return {
    kode: kode,
    navn: (navn || navn === '') ? navn : null,
    href: exports.makeHref(baseUrl, 'ejerlav', [kode])
  };
};

exports.mapAdgangsadresseRef = function(adgangsadresseid, baseUrl) {
  return {
    href: exports.makeHref(baseUrl, 'adgangsadresse', [adgangsadresseid]),
    id: adgangsadresseid
  };
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