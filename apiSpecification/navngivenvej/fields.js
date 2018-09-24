"use strict";

var fieldsUtil = require('../common/fieldsUtil');
var sqlModel = require('./sqlModel');

var normalizedFieldSchemas = require('../replikering/normalizedFieldSchemas');
const { kode4String} = require('../util');
var normalizedField = function (fieldName) {
  return normalizedFieldSchemas.normalizedField('navngivenvej', fieldName);
};


var fields = [
  normalizedField('id'),
  normalizedField('darstatus'),
  normalizedField('oprettet'),
  normalizedField('ændret'),
  normalizedField('navn'),
  normalizedField('adresseringsnavn'),
  {
    name: 'administrerendekommunekode',
    formatter: kode4String
  },
  {
    name: 'administrerendekommunenavn'
  },
  normalizedField('retskrivningskontrol'),
  normalizedField('udtaltvejnavn'),
  {
    name: 'vejstykker',
    multi: true
  },
  normalizedField('beliggenhed_oprindelse_kilde'),
  normalizedField('beliggenhed_oprindelse_nøjagtighedsklasse'),
  normalizedField('beliggenhed_oprindelse_registrering'),
  normalizedField('beliggenhed_oprindelse_tekniskstandard'),
  {
    name: 'beliggenhed_vejnavnelinje'
  },
  {
    name: 'beliggenhed_vejnavneområde'
  },
  {
    name: 'beliggenhed_vejtilslutningspunkter'
  },
  {
    name: 'beliggenhed_geometritype'
  },
  {
    name: 'bbox_xmin'
  },
  {
    name: 'bbox_ymin'
  },
  {
    name: 'bbox_xmax'
  },
  {
    name: 'bbox_ymax'
  },
  {
    name: 'visueltcenter_x'
  },
  {
    name: 'visueltcenter_y'
  },
  {
    name: 'geom_json'
  }
];

fieldsUtil.applySelectability(fields, sqlModel);
fieldsUtil.normalize(fields);
module.exports = fields;
