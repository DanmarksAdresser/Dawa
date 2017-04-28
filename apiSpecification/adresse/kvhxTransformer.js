"use strict";

var _ = require('underscore');
var kvhTransformer = require('../adgangsadresse/kvhTransformer');
var pad = require('../util.js').padUnderscore;
var clean = require('../util.js').removeLeadingUnderscores;
var husnrUtil = require('../husnrUtil');

var regExp = /^(\d{4})(\d{4})(.{4})(.{3})(.{4})/;

exports.format = function(rs) {
  return kvhTransformer.format(rs) +
         pad(rs.etage, 3) +
         pad(rs.dør, 4);
};

exports.validate = function(kvhx) {
  if (kvhx.length !== 19) {
    throw "KVH key must be a string of length 19, but supplied value was '"+kvhx+"' with a length of " + kvhx.length;
  }
  const groups = regExp.exec(kvhx);
  if (!groups) {
    throw "Must consist of 8 digits followed by 4 arbitrary characters, but supplied value was '"+kvhx+"'";
  }
  const husnrText = clean(groups[3]);
  if(!husnrUtil.husnrRegex.test(husnrText)) {
    throw "KVHX key must contain a valid husnr, but " + husnrText + " is not.";
  }
};

exports.kvhxFieldsDts = kvhTransformer.kvhFieldsDts +
'<dt>Index 12-14: Etage</dt><dd>Adressens etage. Hvis etageangivelsen fylder mindre end 3 tegn, foranstilles med underscore, ‘st’ repræsenteres altså som "_st"</dd>' +
'<dt>Index 15-18: Dør</dt><dd>Angivelse af dør. Hvis dørbetegnelsen fylder mindre end 4 tegn, foranstilles med underscore, 2 repræsenteres altså som "___2"';

exports.parse = function(kvhx) {
  try {
    exports.validate(kvhx)
  }
  catch(e) {
    return; // the validate function will be called by the resourceImpl and give the user a error message, so we just bail out to allow the parsing code to expect well formed kvhx values
  }
  var groups = regExp.exec(kvhx);

  return _.extend(
    kvhTransformer.parse(kvhx.substring(0,12)),
    {
      etage: clean(groups[4]),
      dør: clean(groups[5])
    }
  );
};
