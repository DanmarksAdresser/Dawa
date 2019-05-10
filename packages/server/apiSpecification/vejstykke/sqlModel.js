"use strict";

const dbapi = require('../../dbapi');
var nameAndKey = require('./nameAndKey');
var sqlParameterImpl = require('../common/sql/sqlParameterImpl');
var parameters = require('./parameters');
var sqlUtil = require('../common/sql/sqlUtil');
const postgisSqlUtil = require('../common/sql/postgisSqlUtil');
var assembleSqlModel = sqlUtil.assembleSqlModel;
var selectIsoTimestamp = sqlUtil.selectIsoDate;


var columns = {
  id: {
    column: 'vejstykker.id'
  },
  darstatus: {
    column: 'vejstykker.darstatus'
  },
  kode: {
    column: 'vejstykker.kode'
  },
  kommunekode: {
    column: 'vejstykker.kommunekode'
  },
  oprettet: {
    select: selectIsoTimestamp('vejstykker.oprettet')
  },
  ændret: {
    select: 'null::text'
  },
  kommunenavn: {
    select: "k.navn",
    where: null
  },
  navn: {
    column: 'vejstykker.vejnavn'
  },
  adresseringsnavn: {
    column: 'vejstykker.adresseringsnavn'
  },
  postnr: {
    select: null,
    where: function(sqlParts, parameterArray) {
      // this is a bit hackish, we add the parameters from
      // the parent query to the subquery to get
      // correct parameter indices for the subquery
      var subquery = {
        select: ["*"],
        from: ['vejstykkerpostnumremat'],
        whereClauses: ['vejstykkerpostnumremat.kommunekode = vejstykker.kommunekode', 'vejstykkerpostnumremat.vejkode = vejstykker.kode'],
        orderClauses: [],
        sqlParams: sqlParts.sqlParams
      };
      var propertyFilterFn = sqlParameterImpl.simplePropertyFilter([{
        name: 'postnr',
        multi: true
      }], {});
      propertyFilterFn(subquery, {postnr: parameterArray});
      var subquerySql = dbapi.createQuery(subquery).sql;
      sqlParts.whereClauses.push('EXISTS(' + subquerySql + ')');
    }
  },
  postnumre: {
    select: `(SELECT json_agg(CAST((p.nr, p.navn) AS PostnummerRef))
    FROM vejstykkerpostnumremat vp
    JOIN postnumre p ON vp.postnr = p.nr
    WHERE vp.kommunekode = vejstykker.kommunekode AND vp.vejkode = vejstykker.kode)`
  },
  tsv: {
    column: 'vejstykker.tsv'
  },
  geom_json: {
    select: function (sqlParts, sqlModel, params) {
      var sridAlias = dbapi.addSqlParameter(sqlParts, params.srid || 4326);
      return postgisSqlUtil.geojsonColumn(params.srid || 4326, sridAlias, 'vejstykker.geom');
    }
  },
  navngivenvej_id: {
    column: 'vejstykker.navngivenvej_id'
  },
  navngivenvej_darstatus: {
    column: 'nv.darstatus'
  }
};

const distanceParameterImpl = (sqlParts, params) => {
  // This is implemented with a JOIN
  // when using a subquery, PostgreSQL fails to utilize the spatial index
  // Probably a bug in PostgreSQL
  if (params.afstand !== undefined) {
    const kommunekodeAlias = dbapi.addSqlParameter(sqlParts, params.neighborkommunekode);
    const vejkodeAlias = dbapi.addSqlParameter(sqlParts, params.neighborkode);
    const afstandAlias = dbapi.addSqlParameter(sqlParts, params.afstand);
    sqlParts.from.push(`, navngivenvejkommunedel_mat v2`);
    dbapi.addWhereClause(sqlParts, `\
v2.kommunekode = ${kommunekodeAlias} \
AND v2.kode = ${vejkodeAlias} \
AND ST_DWithin(vejstykker.geom, v2.geom, ${afstandAlias})
AND NOT (vejstykker.kommunekode = ${kommunekodeAlias} AND vejstykker.kode = ${vejkodeAlias})`);

  }
};

const regexParameterImpl = (sqlParts, params) => {
  if(params.regex) {
    const regexAlias = dbapi.addSqlParameter(sqlParts, params.regex);
    dbapi.addWhereClause(sqlParts, `vejnavn ~ ${regexAlias}`);
  }
};

function fuzzySearchParameterImpl(sqlParts, params) {
  if(params.fuzzyq) {
    var fuzzyqAlias = dbapi.addSqlParameter(sqlParts, params.fuzzyq);
    sqlParts.whereClauses.push("vejstykker.vejnavn IN (select distinct ON (vejnavn, dist) vejnavn from (SELECT vejnavn, vejnavn <-> " + fuzzyqAlias + " as dist from vejstykker ORDER BY dist LIMIT 1000) as v order by v.dist limit 100)");
    sqlParts.orderClauses.push("levenshtein(lower(vejnavn), lower(" + fuzzyqAlias + "), 2, 1, 3)");
  }
}


var parameterImpls = [
  sqlParameterImpl.simplePropertyFilter(parameters.propertyFilter, columns),
  sqlParameterImpl.includeDeletedVejstykker,
  sqlParameterImpl.search(columns),
  sqlParameterImpl.autocomplete(columns, ['navn']),
  sqlParameterImpl.geomWithin('vejstykker.geom'),
  sqlParameterImpl.reverseGeocoding('vejstykker.geom'),
  distanceParameterImpl,
  regexParameterImpl,
  fuzzySearchParameterImpl,
  sqlParameterImpl.paging(columns, nameAndKey.key)
];

var baseQuery = function() {
  return {
    select: [],
    from: [`navngivenvejkommunedel_mat vejstykker
      LEFT JOIN kommuner k ON (vejstykker.kommunekode = k.kode)
      LEFT JOIN navngivenvej_mat nv ON vejstykker.navngivenvej_id = nv.id`],
    whereClauses: [],
    orderClauses: [],
    sqlParams: []
  };
};

module.exports = sqlUtil.applyFallbackToFuzzySearch(assembleSqlModel(columns, parameterImpls, baseQuery));

var registry = require('../registry');
registry.add('vejstykke', 'sqlModel', undefined, module.exports);
