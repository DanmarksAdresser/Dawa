"use strict";

var datamodels = require('../../crud/datamodel');
var moment = require('moment');
var bbrFieldMappings = require('./fieldMappings');
var _ = require('underscore');
var logger = require('../../logger').forCategory('bbrTransformer');

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


var TIMESTAMP_REGEX = /^(\d{1,}-\d{2}-\d{2})T(\d{2}:\d{2}:\d{2})(\.(\d{1,}))?(Z|(\+|\-)\d{2}(:\d{2})?)?$/;

// The timestamps we receive from BBR are actually local datetimes, i.e. not stored with a timezone offset.
// They are stored in "Danish time" (CET or CEST), corresponding to normal- and summertime. Offsets are +01 or +02.
// When received as events, they are sent WITH timezone offset, but when received in CSV, they are WITHOUT timezone
// offset. Since they are really local times, we ignore any timezone offset and store them as local times as well.
function transformTimestamp(bbrTimestamp) {
  if(!bbrTimestamp) {
    return null;
  }
  var match = TIMESTAMP_REGEX.exec(bbrTimestamp);

  if(match) {
    var datePart = match[1];
    var timePart = match[2];
    var milliPart = match[4];
    if(!milliPart) {
      milliPart = '000';
    }
    while(milliPart.length < 3) {
      milliPart = milliPart + '0';
    }
    return datePart + 'T' + timePart + '.' + milliPart;
  }

  logger.error('unexpected timestamp, trying moment', {bbrTimestampWithoutTz: bbrTimestamp});
  return moment.utc(bbrTimestamp).format('YYYY-MM-DDTHH:mm:ss.SSS');
}

module.exports = {
  vejstykke: function(row) {
    var result = transformBbr(datamodels.vejstykke, bbrFieldMappings.vejstykke)(row);
    var kode = parseInt(result.kode, 10);
    if(kode >= 9900) {
      return null;
    }
    result.oprettet = transformTimestamp(result.oprettet);
    result.aendret = transformTimestamp(result.aendret);
    // BBR sometimes send untrimmed road names.
    if(result.vejnavn) {
      result.vejnavn = result.vejnavn.trim();
    }
    if(result.adresseringsnavn) {
      result.adresseringsnavn = result.adresseringsnavn.trim();
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
    result.oprettet = transformTimestamp(result.oprettet);
    result.aendret = transformTimestamp(result.aendret);
    result.ikraftfra = transformTimestamp(result.ikraftfra);
    return result;
  },
  adgangsadresse: function(row) {
    var result = transformBbrAdgangsadresse(row);
    // vi skal lige have fjernet de foranstillede 0'er
    result.husnr = removePrefixZeroes(result.husnr);

    result.oprettet = transformTimestamp(result.oprettet);
    result.aendret = transformTimestamp(result.aendret);
    result.ikraftfra = transformTimestamp(result.ikraftfra);
    result.adressepunktaendringsdato = transformTimestamp(result.adressepunktaendringsdato);
    if(result.supplerendebynavn) {
      result.supplerendebynavn = result.supplerendebynavn.trim();
    }
    if(result.noejagtighed === 'U') {
      result.etrs89oest = result.etrs89nord = result.kn100mdk = result.kn1kmdk = result.kn10kmdk = null;
    }
    return result;
  }
};

module.exports.internal = {
  transformTimestamp: transformTimestamp
};