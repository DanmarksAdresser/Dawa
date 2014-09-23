"use strict";

var kode4String = require('../util').kode4String;
var _ = require('underscore');
// maps of field names to database column names

var selectIsoTimestamp = require('../common/sql/sqlUtil').selectIsoDate;

exports.columnMappings = {
  vejstykke: [{
    name: 'kode',
    formatter: kode4String
  }, {
    name: 'kommunekode',
    formatter: kode4String
  }, {
    name: 'navn',
    column: 'vejnavn'
  }, {
    name: 'adresseringsnavn'
  }, {
    name: 'oprettet',
    selectTransform: selectIsoTimestamp
  }, {
    name: 'ændret',
    column: 'aendret',
    selectTransform: selectIsoTimestamp
  }],
  postnummer: [{
    name: 'nr',
    formatter: kode4String
  }, {
    name: 'navn'
  },{
    name: 'stormodtager'
  }],
  adgangsadresse: [{
    name: 'id'
  }, {
    name: 'status',
    column: 'objekttype'
  }, {
    name: 'kommunekode',
    formatter: kode4String
  },{
    name: 'vejkode',
    formatter: kode4String
  }, {
    name: 'husnr'
  }, {
    name: 'supplerendebynavn'
  }, {
    name: 'postnr',
    formatter: kode4String
  }, {
    name: 'oprettet',
    selectTransform: selectIsoTimestamp
  }, {
    name: 'ændret',
    column: 'aendret',
    selectTransform: selectIsoTimestamp
  }, {
    name: 'ikrafttrædelsesdato',
    column: 'ikraftfra',
    selectTransform: selectIsoTimestamp
  }, {
    name: 'ejerlavkode'
  }, {
    name: 'matrikelnr'
  }, {
    name: 'esrejendomsnr',
    formatter: function(num) {
      return num ? "" + num : null;
    }
  }, {
    name: 'adgangspunktid'
  }, {
    name: 'etrs89koordinat_øst',
    column: 'etrs89oest'
  }, {
    name: 'etrs89koordinat_nord',
    column: 'etrs89nord'
  }, {
    name: 'nøjagtighed',
    column: 'noejagtighed'
  }, {
    name: 'kilde'
  }, {
    name: 'tekniskstandard'
  }, {
    name: 'tekstretning'
  }, {
    name: 'adressepunktændringsdato',
    column: 'adressepunktaendringsdato',
    selectTransform: selectIsoTimestamp
  }, {
    name: 'ddkn_m100',
    column: 'kn100mdk'
  }, {
    name: 'ddkn_km1',
    column: 'kn1kmdk'
  }, {
    name: 'ddkn_km10',
    column: 'kn10kmdk'
  }
  ],
  adresse: [{
    name: 'id'
  }, {
    name: 'status',
    column: 'objekttype'
  }, {
    name: 'oprettet',
    selectTransform: selectIsoTimestamp
  }, {
    name: 'ændret',
    column: 'aendret',
    selectTransform: selectIsoTimestamp
  }, {
    name: 'ikrafttrædelsesdato',
    column: 'ikraftfra',
    selectTransform: selectIsoTimestamp
  }, {
    name: 'etage'
  }, {
    name: 'dør',
    column: 'doer'
  }, {
    name: 'adgangsadresseid'
  }
  ],
  ejerlav: [{
    name: 'kode'
  }, {
    name: 'navn'
  }]
//  ,
//  regionstilknytning: [{
//    name: 'adgangsadresseid',
//    column: 'adgangsadresse_id'
//  }, {
//    name: 'regionskode',
//    column: "(fields->>'kode')::integer",
//    formatter: kode4String
//  }]
};

// maps column names to field names
exports.columnToFieldName = _.reduce(exports.columnMappings, function(memo, columnSpec, key) {
  memo[key] = _.reduce(columnSpec, function(memo, col) {
    memo[col.column || col.name] = memo[col.name] || col.name;
    return memo;
  }, {});
  return memo;
}, {});

// maps column names to transform function
exports.columnToTransform =  _.reduce(exports.columnMappings, function(memo, columnSpec, key) {
  memo[key] = _.reduce(columnSpec, function(memo, col) {
    memo[col.column || col.name] = col.selectTransform;
    return memo;
  }, {});
  return memo;
}, {});

// maps column names to the select expression used
exports.columnToSelect = _.reduce(exports.columnMappings, function(memo, columnSpec, key) {
  memo[key] = _.reduce(columnSpec, function(memo, col) {

    var columnName = col.column || col.name;
    var select = col.selectTransform ? col.selectTransform(columnName) : columnName;

    memo[col.column || col.name] = select;
    return memo;
  }, {});
  return memo;
}, {});
