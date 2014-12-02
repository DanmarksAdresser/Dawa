"use strict";

var moment = require("moment");

exports.kode4String = function(kodeAsInteger) {
  if(exports.notNull(kodeAsInteger)) {
    return ("0000" + kodeAsInteger).slice(-4);
  }
  else {
    return null;
  }
};

exports.maybeNull = function(val) {
  if(val === undefined) {
    return null;
  }
  return val;
};

exports.padUnderscore = function(val, length) {
  return ('____' + (val||'')).slice(-1 * length);
};

exports.adressebetegnelse = function(adresseRow, adgangOnly) {
  var adresse = adresseRow.vejnavn;
  if(adresseRow.husnr) {
    adresse += ' ' + adresseRow.husnr;
  }
  if(!adgangOnly) {
    if(exports.notNull(adresseRow.etage) || exports.notNull(adresseRow.dør)) {
      adresse += ',';
    }
    if(adresseRow.etage) {
      adresse += ' ' + adresseRow.etage + '.';
    }
    if(adresseRow.dør) {
      adresse += ' ' + adresseRow.dør;
    }
  }
  adresse += ', ';
  if(adresseRow.supplerendebynavn) {
    adresse += adresseRow.supplerendebynavn + ', ';
  }
  adresse += adresseRow.postnr + ' ' + adresseRow.postnrnavn;
  return adresse;
};

exports.d = function(date) {
  if(typeof date === 'string') {
    return date;
  }
  if(date) {
    return moment(date).toISOString();
  }
  return date;
};

exports.notNull = function (obj) {
  return obj !== undefined && obj !== null;
};

exports.zoneKodeFormatter = function(zoneKode) {
  if (zoneKode === 1) {
    return 'Byzone';
  }
  else if (zoneKode === 2) {
    return 'Sommerhusområde';
  }
  else if (zoneKode === 3) {
    return 'Landzone';
  }
};
