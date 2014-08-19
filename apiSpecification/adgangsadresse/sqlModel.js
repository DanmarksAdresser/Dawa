"use strict";

var nameAndKey = require('./nameAndKey');
var sqlParameterImpl = require('../common/sql/sqlParameterImpl');
var parameters = require('./parameters');
var sqlUtil = require('../common/sql/sqlUtil');
var assembleSqlModel = sqlUtil.assembleSqlModel;
var selectIsoTimestamp = sqlUtil.selectIsoDate;
var dbapi = require('../../dbapi');

var columns =  {
  id: {
    column: 'a_id'
  },
  etrs89koordinat_øst: {
    column: 'oest'
  },
  etrs89koordinat_nord: {
    column: 'nord'
  },
  wgs84koordinat_bredde: {
    column: 'ST_Y(ST_Transform(AdgangsadresserView.geom, 4326))'
  },
  wgs84koordinat_længde: {
    column: 'ST_X(ST_Transform(AdgangsadresserView.geom, 4326))'
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
    column: selectIsoTimestamp('adressepunktaendringsdato')
  },
  geom_json: {
    select: function(sqlParts, sqlModel, params) {
      var sridAlias = dbapi.addSqlParameter(sqlParts, params.srid || 4326);
      return 'ST_AsGeoJSON(ST_Transform(AdgangsadresserView.geom,' + sridAlias + '))';
    }
  },
  oprettet: {
    select: selectIsoTimestamp('a_oprettet')
  },
  ændret: {
    select: selectIsoTimestamp('a_aendret')
  },
  ikrafttrædelse: {
    select: selectIsoTimestamp('a_ikraftfra')
  },
  tsv: {
    column: 'tsv'
  }
};

var baseQuery = function () {
  return {
    select: [],
    from: ['AdgangsadresserView'],
    whereClauses: [],
    orderClauses: [],
    sqlParams: []
  };
};

var parameterImpls = [
  sqlParameterImpl.simplePropertyFilter(parameters.propertyFilter, columns),
  sqlParameterImpl.geomWithin(),
  sqlParameterImpl.reverseGeocoding(),
  sqlParameterImpl.dagiFilter(),
  sqlParameterImpl.search(columns),
  sqlParameterImpl.autocomplete(columns, ['husnr']),
  sqlParameterImpl.paging(columns, nameAndKey.key)
];

module.exports = assembleSqlModel(columns, parameterImpls, baseQuery);

var registry = require('../registry');
registry.add('adgangsadresse', 'sqlModel', undefined, module.exports);