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

exports.numberToString = (num) => {
  if(typeof(num) === 'undefined' || num === null) {
    return null;
  }
  return num.toString();
};

exports.stringToNumber = str => str ? parseInt(str, 10) : null

exports.maybeNull = function(val) {
  if(val === undefined) {
    return null;
  }
  return val;
};

exports.padUnderscore = function(val, length) {
  return ('____' + (val||'')).slice(-1 * length);
};

exports.removeLeadingUnderscores = function(val) {
  var cleaned = val.replace(/_/g, '');

  if (cleaned === '') {
    return null;
  }

  return cleaned;
}

exports.adressebetegnelse = function(adresseFields, adgangOnly) {
  var adresse = adresseFields.vejnavn;
  if(adresseFields.husnr) {
    adresse += ' ' + adresseFields.husnr;
  }
  if(!adgangOnly) {
    if(exports.notNull(adresseFields.etage) || exports.notNull(adresseFields.dør)) {
      adresse += ',';
    }
    if(adresseFields.etage) {
      adresse += ' ' + adresseFields.etage + '.';
    }
    if(adresseFields.dør) {
      adresse += ' ' + adresseFields.dør;
    }
  }
  adresse += ', ';
  if(adresseFields.supplerendebynavn) {
    adresse += adresseFields.supplerendebynavn + ', ';
  }
  adresse += (adresseFields.postnr || '') + ' ' + (adresseFields.postnrnavn || '');
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
    return 'Landzone';
  }
  else if (zoneKode === 3) {
    return 'Sommerhusområde';
  }
};
