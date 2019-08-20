"use strict";

const sqlParameterImpl = require('../common/sql/sqlParameterImpl');
const parameters = require('./parameters');
const  {assembleSqlModel}  = require('../common/sql/sqlUtil');
const dbapi = require('../../dbapi');
const { applyFallbackToFuzzySearch }= require('../common/sql/sqlUtil')
const stedColumns  = require('../sted/columns');
const { notNull } = require('../util');

const columns = Object.entries(stedColumns).reduce((memo, [columnName, col]) => {
    memo[`sted_${columnName}`] = col;
    return memo;
  },
  {
    navn: {
      column: 'stednavne.navn'
    },
    navnestatus: {
      column: 'stednavne.navnestatus'
    },
    brugsprioritet: {
      column: 'stednavne.brugsprioritet'
    },
    tsv: {
      column: 'stednavne.tsv'
    }
  });


const fuzzySearchParameterImpl = (sqlParts, params) => {
  if(params.fuzzyq) {
    const fuzzyqAlias = dbapi.addSqlParameter(sqlParts, params.fuzzyq);
    sqlParts.whereClauses.push("stednavne.navn IN (select distinct ON (navn, dist) navn from (SELECT navn, navn <-> " + fuzzyqAlias + " as dist from stednavne ORDER BY dist LIMIT 1000) as v order by v.dist limit 100)");
    sqlParts.orderClauses.push(`levenshtein(lower(stednavne.navn), lower(${fuzzyqAlias}), 2, 1, 3)`);
  }
};

const parameterImpls = [
  sqlParameterImpl.simplePropertyFilter(parameters.propertyFilter, columns),
  sqlParameterImpl.reverseGeocodingWithin(),
  sqlParameterImpl.reverseGeocoding('geom', true),
  sqlParameterImpl.geomWithin(),
  sqlParameterImpl.searchFilter(columns),
  sqlParameterImpl.searchRankStednavne,
  fuzzySearchParameterImpl,
  sqlParameterImpl.paging(columns, ['sted_id', 'navn'])
];

const baseQuery = () => ({
    select: [],
    from: [`stednavne join steder on stednavne.stedid = steder.id 
    join stednavne p_stednavn ON steder.id = p_stednavn.stedid 
      and p_stednavn.brugsprioritet = 'primær'`],
    whereClauses: [],
    orderClauses: [],
    sqlParams: []
  });

const sqlModel = assembleSqlModel(columns, parameterImpls, baseQuery);
module.exports = applyFallbackToFuzzySearch(sqlModel);

const registry = require('../registry');
registry.add('stednavn', 'sqlModel', undefined, module.exports);
