"use strict";

var _ = require('underscore');
var kvhTransformer = require('../adgangsadresse/kvhTransformer');
var pad = require('../util.js').padUnderscore;
var clean = require('../util.js').removeLeadingUnderscores;

var regExp = /^(\d{4})(\d{4})(.{4})(.{3})(.{4})/;

exports.format = function(rs) {
  return kvhTransformer.format(rs) +
         pad(rs.etage, 3) +
         pad(rs.dør, 4);
};

exports.validate = function(kvh) {
  if (kvh.length !== 19) {
    throw "KVH key must be a string of length 19, but supplied value was '"+kvh+"' with a length of " + kvh.length;
  }
  if (!kvh.match(regExp)) {
    throw "Must consist of 8 digits followed by 11 arbitrary characters, but supplied value was '"+kvh+"'";
  }
};

exports.kvhxFieldsDts = kvhTransformer.kvhFieldsDts +
'<dt>Index 12-14: Etage</dt><dd>Adressens etage. Hvis etageangivelsen fylder mindre end 3 tegn, foranstilles med underscore, ‘st’ repræsenteres altså som "_st"</dd>' +
'<dt>Index 15-18: Dør</dt><dd>Angivelse af dør. Hvis dørbetegnelsen fylder mindre end 4 tegn, foranstilles med underscore, 2 repræsenteres altså som "___2"';

exports.parse = function(kvh) {
  var groups = regExp.exec(kvh);

  return _.extend(
    kvhTransformer.parse(kvh),
    {
      etage: clean(groups[4]),
      dør: clean(groups[5])
    }
  );
};