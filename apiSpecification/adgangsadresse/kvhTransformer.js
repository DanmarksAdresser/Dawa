"use strict";

var kode4String = require('../util').kode4String;

exports.format = function(rs) {
  return kode4String(rs.kommunekode || 0) +
         kode4String(rs.vejkode || 0) +
         kode4String(rs.husnr || 0);
};

exports.kvhFieldsDts = '<dt>Index 0-3: Kommunekode</dt><dd>Kommunekode for adressen (TODO her mangler link). Hvis kommunekoden har mindre end 4 cifre, foranstilles med nuller, kommunekode 175 repræsenteres altså fx som "0175". Hvis en adresse ikke har et tilknyttet kommunenr er værdien "0000"</dd>' +
                       '<dt>Index 4-7: Vejstykkekode</dt><dd>Kode for adressens vejstykke (TODO her mangler link). Hvis vejstykkets kode har mindre end 4 cifre, foranstilles med nuller, vejstykkekode 370 repræsenteres altså fx som "0370".</dd>' +
                       '<dt>Index 8-11: Husnr</dt><dd>Adressens husnr (inklusive evt. bogstav) (TODO her mangler link). Hvis husnummeret har mindre end 4 cifre, foranstilles med nuller, 1C repræsenteres altså fx som ‘001C’. Husnumre uden bogstav repræsenteres blot med foranstillede nuller, så fx 17 repræsenteres som "0017".</dd>';
