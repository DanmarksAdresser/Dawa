"use strict";

var kode4String = require('../util').kode4String;
var pad = require('../util.js').padUnderscore;
var clean = require('../util.js').removeLeadingUnderscores;
var husnrUtil = require('../husnrUtil');

var regExp = /^(\d{4})(\d{4})(.{4})/;


exports.format = function(rs) {
  return kode4String(rs.kommunekode || 0) +
         kode4String(rs.vejkode || 0) +
         pad(husnrUtil.formatHusnr(rs.husnr), 4);
};

exports.validate = function(kvh) {
  if (kvh.length !== 12) {
    throw "KVH key must be a string of length 12, but supplied value was '"+kvh+"' with a length of " + kvh.length;
  }
  const groups = regExp.exec(kvh);
  if (!groups) {
    throw "Must consist of 8 digits followed by 4 arbitrary characters, but supplied value was '"+kvh+"'";
  }
  const husnrText = clean(groups[3]);
  if(!husnrUtil.husnrRegex.test(husnrText)) {
    throw "KVH key must contain a valid husnr, but " + husnrText + " is not.";
  }
};

exports.kvhFieldsDts = '<dt>Index 0-3: Kommunekode</dt><dd>Kommunekode for adressen. Hvis kommunekoden har mindre end 4 cifre, foranstilles med nuller, kommunekode 175 repræsenteres altså fx som "0175". Hvis en adresse ikke har et tilknyttet kommunenr er værdien "0000"</dd>' +
                       '<dt>Index 4-7: Vejstykkekode</dt><dd>Kode for adressens vejstykke. Hvis vejstykkets kode har mindre end 4 cifre, foranstilles med nuller, vejstykkekode 370 repræsenteres altså fx som "0370".</dd>' +
                       '<dt>Index 8-11: Husnr</dt><dd>Adressens husnr (inklusive evt. bogstav). Hvis husnummeret har mindre end 4 cifre, foranstilles med underscores, 1C repræsenteres altså fx som ‘__1C’. Husnumre uden bogstav repræsenteres blot med foranstillede underscores, så fx 17 repræsenteres som "__17".</dd>';

exports.parse = function(kvh) {
  try {
    exports.validate(kvh);
  }
  catch(e){
    return; // the validate function will be called by the resourceImpl and give the user a error message, so we just bail out to allow the parsing code to expect well formed kvh values
  }

  const groups = regExp.exec(kvh);

  return {
    kommunekode: groups[1],
    vejkode: groups[2],
    husnr: husnrUtil.parseHusnr(clean(groups[3]))
  };
};
