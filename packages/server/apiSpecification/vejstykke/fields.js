"use strict";

var fieldsUtil = require('../common/fieldsUtil');
var sqlModel = require('./sqlModel');

var normalizedFieldSchemas = require('../replikering/normalizedFieldSchemas');

var normalizedField = function(fieldName) {
  return normalizedFieldSchemas.normalizedField('vejstykke', fieldName);
};


var fields = [
  normalizedField('kode'),
  normalizedField('kommunekode'),
  normalizedField('oprettet'),
  normalizedField('ændret'),
  {
    name: 'kommunenavn'
  },
  normalizedField('navn'),
  normalizedField('adresseringsnavn'),
  {
    name: 'postnr'
  },
  {
    name: 'postnumre',
    multi: true
  },
  {
    name: 'geom_json',
    selectable: true
  },
  {
    name: 'navngivenvej_id',
  },
  {
    name: 'navngivenvej_darstatus'
  },
  normalizedField('id'),
  {
    name: 'darstatus'
  }
];

fieldsUtil.applySelectability(fields, sqlModel);
fieldsUtil.normalize(fields);
module.exports =  fields;
