"use strict";

var fieldsUtil = require('../common/fieldsUtil');
var sqlModel = require('./sqlModel');

var normalizedFieldSchemas = require('../replikering/normalizedFieldSchemas');

var normalizedField = function(fieldName) {
  return normalizedFieldSchemas.normalizedField('navngivenvej', fieldName);
};


var fields = [
  normalizedField('id'),
  normalizedField('darstatus'),
  normalizedField('oprettet'),
  normalizedField('ændret'),
  normalizedField('navn'),
  normalizedField('adresseringsnavn'),
  normalizedField('administreresafkommune'),
  normalizedField('beskrivelse'),
  normalizedField('retskrivningskontrol'),
  normalizedField('udtaltvejnavn'),
  {
    name: 'vejstykker',
    multi: true
  }
];

fieldsUtil.applySelectability(fields, sqlModel);
fieldsUtil.normalize(fields);
module.exports =  fields;
