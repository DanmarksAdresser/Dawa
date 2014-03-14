"use strict";

var nameAndKey = require('./nameAndKey');
var sqlParameterImpl = require('../common/sql/sqlParameterImpl');
var parameters = require('./parameters');
var assembleSqlModel = require('../common/sql/sqlUtil').assembleSqlModel;

var columns = {
  kode: {
    column: 'vejstykker.kode'
  },
  kommunekode: {
    column: 'vejstykker.kommunekode'
  },
  kommunenavn: {
    select: 'max(kommuner.navn)',
    where: null
  },
  version: {
    column: 'vejstykker.version'
  },
  navn: {
    column: 'vejstykker.vejnavn'
  },
  postnr: {
    select: null,
    where: 'vp2.postnr'
  },
  postnumre: {
    select: 'json_agg(DISTINCT CAST((p.nr, p.navn) AS PostnummerRef))'
  },
  tsv: {
    select: null,
    where: 'vejstykker.tsv'
  }
};

var parameterImpls = [
  sqlParameterImpl.simplePropertyFilter(parameters.propertyFilter, columns),
  sqlParameterImpl.search(columns),
  sqlParameterImpl.autocomplete(columns),
  sqlParameterImpl.paging(columns, nameAndKey.key)
];

var baseQuery = function() {
  return {
    select: [],
    from: ['vejstykker' +
      " LEFT JOIN DagiTemaer kommuner ON kommuner.tema = 'kommune' AND vejstykker.kommunekode = kommuner.kode" +
      ' LEFT JOIN vejstykkerPostnumreMat  vp1 ON (vp1.kommunekode = vejstykker.kommunekode AND vp1.vejkode = vejstykker.kode)' +
      ' LEFT JOIN Postnumre p ON (p.nr = vp1.postnr)' +
      ' LEFT JOIN vejstykkerPostnumreMat vp2 ON (vp2.kommunekode = vejstykker.kommunekode AND vp2.vejkode = vejstykker.kode)'],
    whereClauses: [],
    groupBy: 'vejstykker.kode, vejstykker.kommunekode',
    orderClauses: [],
    sqlParams: []
  };
};

module.exports = assembleSqlModel(columns, parameterImpls, baseQuery);

var registry = require('../registry');
registry.add('vejstykke', 'sqlModel', undefined, module.exports);