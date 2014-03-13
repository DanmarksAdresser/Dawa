"use strict";

var nameAndKey = require('./nameAndKey');
var sqlParameterImpl = require('../common/sql/sqlParameterImpl');
var parameters = require('./parameters');
var assembleSqlModel = require('../common/sql/sqlUtil').assembleSqlModel;
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
    select: function(sqlParts, sqlModel, params) {
      var sridAlias = dbapi.addSqlParameter(sqlParts, params.srid || 4326);
      return 'ST_AsGeoJSON(ST_Transform(AdgangsadresserView.geom,' + sridAlias + '))';
    }
  },
  oprettet: {
    select: 'a_oprettet'
  },
  ændret: {
    select: 'a_aendret'
  },
  ikrafttrædelse: {
    select: 'a_ikraftfra'
  },
  tsv: {
    select: null,
      where: 'tsv'
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
  sqlParameterImpl.search(columns),
  sqlParameterImpl.autocomplete(columns),
  sqlParameterImpl.paging(columns, nameAndKey.key),
  sqlParameterImpl.geomWithin(),
  sqlParameterImpl.reverseGeocoding(),
  sqlParameterImpl.dagiFilter()
];

module.exports = assembleSqlModel(columns, parameterImpls, baseQuery);