"use strict";

var vejnavn = /([a-zæøåA-ZÆØÅ0-9äéèëöüÿÄÉÈËÖÜŸ'\s\.\-,\/\(\)]+?)/.source;
var husnr = /(\d{1,3}\s*[A-ZÆØÅa-zæøå]{0,1}(?![A-ZÆØÅa-zæøå]))/.source;
var etage = /(kl|k1|k2|k3|k4|k5|k6|k7|k8|k9|st|\d{1,2})/.source;
var dør = /([a-zæøå\d\/\- ]{1,4})/.source;
var supplerendebynavn = /([A-ZÆØÅa-zæøåéè\s\.\-\d\/,]+,{0,1})/.source;
var postnr = /(\d{4})/.source;
var postnrnavn = /\s+([A-ZÆØÅa-zæøå\s\.\-]+)/.source;

var vejnavnStrict = `\\s*${vejnavn}`;
var husnrStrict = `\\s+${husnr}`;
var etageDørStrict = `(?:\\s*,\\s*(?:${etage}\\.)?\\s*${dør}?)?`;
var supplerendebynavnStrict = `(?:\\s*,\\s*${supplerendebynavn})?`;
var postnrStrict = `\\s*,\\s*${postnr}`;
var postnrnavnStrict = `\\s*${postnrnavn}`;

var strictRegexString = `^${vejnavnStrict}${husnrStrict}${etageDørStrict}${supplerendebynavnStrict}${postnrStrict}${postnrnavnStrict}$`;

exports.strict = new RegExp(strictRegexString);
exports.internal = {
  vejnavnStrict: vejnavnStrict,
  husnrStrict: husnrStrict,
  etageDørStrict: etageDørStrict,
  supplerendeBynavnStrict: supplerendebynavnStrict,
  postnrStrict: postnrStrict,
  postnrnavnStrict: postnrnavnStrict
};
