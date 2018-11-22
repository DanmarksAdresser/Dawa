"use strict";

var dbapi = require('../../dbapi');
var nameAndKey = require('./nameAndKey');
var sqlParameterImpl = require('../common/sql/sqlParameterImpl');
var parameters = require('./parameters');
var sqlUtil = require('../common/sql/sqlUtil')

var assembleSqlModel = sqlUtil.assembleSqlModel;

var columns = {
  navn: {
    column: 'vejstykker.vejnavn'
  },
  postnr: {
    select: null,
    where: 'vp2.postnr'
  },
  kommunekode: {
    select: null,
      where: 'vejstykker.kommunekode'
  },
  kommuner: {
    select: "json_agg(DISTINCT CAST((k.kode, k.navn) AS KommuneRef))"
  },
  postnumre: {
    select: 'json_agg(DISTINCT CAST((p.nr, p.navn) AS PostnummerRef))'
  },
  tsv: {
    column: 'vejstykker.tsv'
  }
};

function fuzzySearchParameterImpl(sqlParts, params) {
  if(params.fuzzyq) {
    var fuzzyqAlias = dbapi.addSqlParameter(sqlParts, params.fuzzyq);
    sqlParts.whereClauses.push("vejstykker.vejnavn IN (select distinct ON (vejnavn, dist) vejnavn from (SELECT vejnavn, vejnavn <-> " + fuzzyqAlias + " as dist from vejstykker ORDER BY dist LIMIT 1000) as v order by v.dist limit 100)");
    sqlParts.orderClauses.push(`levenshtein(lower(vejstykker.vejnavn), lower(${fuzzyqAlias}), 2, 1, 3)`);
  }
}


var parameterImpls = [
  sqlParameterImpl.simplePropertyFilter(parameters.propertyFilter, columns),
  sqlParameterImpl.search(columns),
  sqlParameterImpl.autocomplete(columns, ['navn']),
  fuzzySearchParameterImpl,
  sqlParameterImpl.paging(columns, nameAndKey.key)
];

var baseQuery = function() {
  return {
    select: [],
    from: [
      ' vejstykker' +
        " LEFT JOIN kommuner k ON k.kode = vejstykker.kommunekode" +
        ' LEFT JOIN vejstykkerPostnumreMat  vp1 ON (vp1.kommunekode = vejstykker.kommunekode AND vp1.vejkode = vejstykker.kode)' +
        ' LEFT JOIN Postnumre p ON (p.nr = vp1.postnr)' +
        ' LEFT JOIN vejstykkerPostnumreMat vp2 ON (vp2.kommunekode = vejstykker.kommunekode AND vp2.vejkode = vejstykker.kode)'
    ],
    whereClauses: [],
    groupBy: 'vejstykker.vejnavn, vejstykker.tsv',
    orderClauses: [],
    sqlParams: []
  };
};



var sqlModel = assembleSqlModel(columns, parameterImpls, baseQuery);

module.exports = sqlUtil.applyFallbackToFuzzySearch(sqlModel);

var registry = require('../registry');
registry.add('vejnavn', 'sqlModel', undefined, module.exports);
