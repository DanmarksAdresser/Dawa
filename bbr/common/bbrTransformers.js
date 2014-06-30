"use strict";

var datamodels = require('../../crud/datamodel');
var moment = require('moment');
var bbrFieldMappings = require('./fieldMappings');
var _ = require('underscore');

function transformBbr(datamodel, fieldMapping) {
  var mapping = _.invert(fieldMapping);
  return function(row) {
    return _.reduce(row, function(memo, value, key) {
      if(value === 'null') {
        value = null;
      }
      if(value === '') {
        value = null;
      }
      var datamodelKey = mapping[key] || key;
      
      if(!_.contains(datamodel.columns, datamodelKey)) {
        return memo;
      }
      memo[datamodelKey] = value;
      return memo;
    }, {});
  };
}


var transformBbrAdgangsadresse = transformBbr(datamodels.adgangsadresse, bbrFieldMappings.adgangsadresse);
var transformAdresse = transformBbr(datamodels.adresse, bbrFieldMappings.adresse);

function removePrefixZeroes(str) {
  while (str && str.charAt(0) === '0') {
    str = str.substring(1);
  }
  return str;
}

function transformDate(bbrDateWithoutTz) {
  if(bbrDateWithoutTz) {
    return moment.utc(bbrDateWithoutTz).toISOString();
  }
  else {
    return undefined;
  }
}

module.exports = {
  vejstykke: function(row) {
    var result = transformBbr(datamodels.vejstykke, bbrFieldMappings.vejstykke)(row);
    result.oprettet = transformDate(result.oprettet);
    result.aendret = transformDate(result.aendret);
    // BBR sometimes send untrimmed road names.
    if(result.vejnavn) {
      result.vejnavn = result.vejnavn.trim();
    }
    return result;
  },
  adresse: function(row) {
    var result = transformAdresse(row);
    if(!_.isUndefined(result.etage) && !_.isNull(result.etage)) {
      result.etage = removePrefixZeroes(result.etage);
      result.etage = result.etage.toLowerCase();
    }
    if(!_.isUndefined(result.doer) && !_.isNull(result.doer)) {
      result.doer = result.doer.toLowerCase();
    }
    result.oprettet = transformDate(result.oprettet);
    result.aendret = transformDate(result.aendret);
    result.ikraftfra = transformDate(result.ikraftfra);
    return result;
  },
  adgangsadresse: function(row) {
    var result = transformBbrAdgangsadresse(row);
    // vi skal lige have fjernet de foranstillede 0'er
    result.husnr = removePrefixZeroes(result.husnr);

    result.oprettet = transformDate(result.oprettet);
    result.aendret = transformDate(result.aendret);
    result.ikraftfra = transformDate(result.ikraftfra);
    result.adressepunktaendringsdato = transformDate(result.adressepunktaendringsdato);
    if(result.noejagtighed === 'U') {
      result.etrs89oest = result.etrs89nord = result.wgs84long = result.wgs84lat = result.kn100mdk = result.kn1kmdk = result.kn10kmdk = null;
    }
    return result;
  }
};
