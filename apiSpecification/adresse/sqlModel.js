"use strict";

var nameAndKey = require('./nameAndKey');
var sqlParameterImpl = require('../common/sql/sqlParameterImpl');
var parameters = require('./parameters');
var sqlUtil = require('../common/sql/sqlUtil');
var assembleSqlModel = sqlUtil.assembleSqlModel;
var selectIsoTimestamp = sqlUtil.selectIsoDate;
var dbapi = require('../../dbapi');

var columns = {
  id: {
    column: 'e_id'
  },
  oprettet: {
    select: selectIsoTimestamp('e_oprettet')
  },
  ændret:{
    select: selectIsoTimestamp('e_aendret')
  },
  ikrafttrædelse: {
    select: selectIsoTimestamp('e_ikraftfra')
  },
  adgangsadresseid: {
    column: 'a_id'
  },
  dør: {
    column: 'doer'
  },
  tsv: {
    column: 'e_tsv'
  },
  etrs89koordinat_øst: {
    column: 'oest'
  },
  etrs89koordinat_nord: {
    column: 'nord'
  },
  wgs84koordinat_bredde: {
    column: 'lat'
  },
  wgs84koordinat_længde: {
    column: 'long'
  },
  nøjagtighed: {
    column: 'noejagtighed'
  },
  ddkn_m100: {
    column: 'kn100mdk'
  },
  ddkn_km1: {
    column: 'kn1kmdk'
  },
  ddkn_km10: {
    column: 'kn10kmdk'
  },
  adressepunktændringsdato: {
    column: 'adressepunktaendringsdato'
  },
  geom_json: {
    select: function (sqlParts, sqlModel, params) {
      var sridAlias = dbapi.addSqlParameter(sqlParts, params.srid || 4326);
      return 'ST_AsGeoJSON(ST_Transform(geom,' + sridAlias + '))';
    }
  },
  adgangsadresse_oprettet: {
    select: selectIsoTimestamp('a_oprettet')
  },
  adgangsadresse_ændret: {
    select: selectIsoTimestamp('a_aendret')
  },
  adgangsadresse_ikrafttrædelse: {
    select: selectIsoTimestamp('a_ikraftfra')
  }
};

var baseQuery = function () {
  return {
    select: [],
    from: ['Adresser'],
    whereClauses: [],
    orderClauses: [],
    sqlParams: []
  };
};

// WARNING: order matters!
var parameterImpls = [
  sqlParameterImpl.simplePropertyFilter(parameters.propertyFilter, columns),
  sqlParameterImpl.geomWithin(),
  sqlParameterImpl.dagiFilter(),
  sqlParameterImpl.search(columns),
  sqlParameterImpl.autocomplete(columns, ['husnr', 'etage', 'dør']),
  sqlParameterImpl.paging(columns, nameAndKey.key)
];

module.exports = assembleSqlModel(columns, parameterImpls, baseQuery);

var registry = require('../registry');
registry.add('adresse', 'sqlModel', undefined, module.exports);