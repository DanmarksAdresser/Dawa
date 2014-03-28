"use strict";

var nameAndKey = require('./nameAndKey');
var sqlParameterImpl = require('../common/sql/sqlParameterImpl');
var parameters = require('./parameters');
var assembleSqlModel = require('../common/sql/sqlUtil').assembleSqlModel;

var columns = {
  navn: {
    select: 's.supplerendebynavn',
    where: 's.supplerendebynavn'
  },
  kommunekode: {
    select: null,
    where: 'filter.kommunekode'
  },
  postnr: {
    select: null,
    where: 'filter.postnr'
  },
  kommuner: {
    select: 'json_agg(DISTINCT CAST((k.kode, k.navn) AS KommuneRef))'
  },
  postnumre: {
    select: 'json_agg(DISTINCT CAST((p.nr, p.navn) AS PostnummerRef))'
  },
  tsv: {
    column: 's.tsv'
  }
};

var baseQuery = function () {
  return {
    select: [],
    from: [' supplerendebynavne s' +
      ' LEFT JOIN supplerendebynavne filter ON s.supplerendebynavn = filter.supplerendebynavn' +
      " LEFT JOIN DagiTemaer k ON k.tema = 'kommune' AND s.kommunekode = k.kode" +
      ' LEFT JOIN postnumre p ON s.postnr = p.nr'],
    whereClauses: [],
    groupBy: 's.supplerendebynavn, s.tsv',
    orderClauses: [],
    sqlParams: []
  };
};

var parameterImpls = [
  sqlParameterImpl.simplePropertyFilter(parameters.propertyFilter, columns),
  sqlParameterImpl.search(columns),
  sqlParameterImpl.autocomplete(columns),
  sqlParameterImpl.paging(columns, nameAndKey.key)
];

module.exports = assembleSqlModel(columns, parameterImpls, baseQuery);

var registry = require('../registry');
registry.add('supplerendebynavn', 'sqlModel', undefined, module.exports);