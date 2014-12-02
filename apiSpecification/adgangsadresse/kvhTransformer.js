"use strict";

var kode4String = require('../util').kode4String;
var pad = require('../util.js').padUnderscore;

exports.format = function(rs) {
  return kode4String(rs.kommunekode || 0) +
         kode4String(rs.vejkode || 0) +
         pad(rs.husnr, 4);
};

exports.kvhFieldsDts = '<dt>Index 0-3: Kommunekode</dt><dd>Kommunekode for adressen. Hvis kommunekoden har mindre end 4 cifre, foranstilles med nuller, kommunekode 175 repræsenteres altså fx som "0175". Hvis en adresse ikke har et tilknyttet kommunenr er værdien "0000"</dd>' +
                       '<dt>Index 4-7: Vejstykkekode</dt><dd>Kode for adressens vejstykke. Hvis vejstykkets kode har mindre end 4 cifre, foranstilles med nuller, vejstykkekode 370 repræsenteres altså fx som "0370".</dd>' +
                       '<dt>Index 8-11: Husnr</dt><dd>Adressens husnr (inklusive evt. bogstav). Hvis husnummeret har mindre end 4 cifre, foranstilles med underscores, 1C repræsenteres altså fx som ‘__1C’. Husnumre uden bogstav repræsenteres blot med foranstillede underscores, så fx 17 repræsenteres som "__17".</dd>';
