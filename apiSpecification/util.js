"use strict";

exports.kode4String = function(kodeAsInteger) {
  return ("0000" + kodeAsInteger).slice(-4);
};

exports.maybeNull = function(val) {
  if(val === undefined) {
    return null;
  }
  return val;
};

exports.adressebetegnelse = function(adresseRow, adgangOnly) {
  var adresse = adresseRow.vejnavn;
  if(adresseRow.husnr) {
    adresse += ' ' + adresseRow.husnr;
  }
  if(!adgangOnly) {
    if(adresseRow.etage) {
      adresse += ' ' + adresseRow.etage + '.';
    }
    if(adresseRow.dør) {
      adresse += ' ' + adresseRow.dør;
    }
  }
  adresse += '\n';
  if(adresseRow.supplerendebynavn) {
    adresse += adresseRow.supplerendebynavn + '\n';
  }
  adresse += adresseRow.postnr + ' ' + adresseRow.postnrnavn;
  return adresse;
};

exports.d = function(date) {
  if(date instanceof Date) {
    return date.toString();
  }
  else if(date) {
    return date;
  }
  else {
    return null;
  }
};

exports.notNull = function (obj) {
  return obj !== undefined && obj !== null;
};

