"use strict";

const dbapi = require('../../dbapi');
var nameAndKey = require('./nameAndKey');
var sqlParameterImpl = require('../common/sql/sqlParameterImpl');
var parameters = require('./parameters');
const registry = require('../registry');
var sqlUtil = require('../common/sql/sqlUtil');
const {geojsonColumn, bboxVisualCenterColumns} = require('../common/sql/postgisSqlUtil');

const assembleSqlModel = sqlUtil.assembleSqlModel;
const selectIsoTimestamp = sqlUtil.selectIsoDateUtc;

const columns = {
  id: {
    column: 'nv.id'
  },
  oprettet: {
    select: selectIsoTimestamp('oprettet')
  },
  ændret: {
    select: selectIsoTimestamp('ændret')
  },
  ikrafttrædelse: {
    select: selectIsoTimestamp('ikrafttrædelse')
  },
  nedlagt: {
    select: selectIsoTimestamp('nedlagt')
  },
  beliggenhed_oprindelse_registrering: {
    select: selectIsoTimestamp('beliggenhed_oprindelse_registrering')
  },
  vejstykker: {
    select: `(SELECT json_agg(json_build_object('kommunekode', v.kommunekode, 'kode', v.kode, 'id', v.id))
    FROM navngivenvejkommunedel_mat v
    WHERE v.navngivenvej_id = nv.id)`
  },
  administrerendekommunekode: {
    column: 'administrerendekommune'
  },
  administrerendekommunenavn: {
    select: `(select navn from kommuner k where k.kode = nv.administrerendekommune)`
  },
  beliggenhed_geometritype: {
    select: `(case when beliggenhed_vejnavnelinje is not null then 'vejnavnelinje' else 'vejnavneområde' end)`
  },
  kommunekode: {
    select: null,
    where: function (sqlParts, parameterArray) {
      // this is a bit hackish, we add the parameters from
      // the parent query to the subquery to get
      // correct parameter indices for the subquery
      const subquery = {
        select: ["*"],
        from: ['vejstykker'],
        whereClauses: ['navngivenvej_id = nv.id'],
        orderClauses: [],
        sqlParams: sqlParts.sqlParams
      };
      const propertyFilterFn = sqlParameterImpl.simplePropertyFilter([{
        name: 'kommunekode',
        multi: true
      }], {});
      propertyFilterFn(subquery, {kommunekode: parameterArray});
      const subquerySql = dbapi.createQuery(subquery).sql;
      sqlParts.whereClauses.push('EXISTS(' + subquerySql + ')');
    }
  },
  vejstykkeid: {
    select: null,
    where: function (sqlParts, parameterArray) {
      // this is a bit hackish, we add the parameters from
      // the parent query to the subquery to get
      // correct parameter indices for the subquery
      const subquery = {
        select: ["*"],
        from: ['vejstykker'],
        whereClauses: ['navngivenvej_id = nv.id'],
        orderClauses: [],
        sqlParams: sqlParts.sqlParams
      };
      const propertyFilterFn = sqlParameterImpl.simplePropertyFilter([{
        name: 'navngivenvejkommunedel_id',
        multi: true
      }], {});
      propertyFilterFn(subquery, {navngivenvejkommunedel_id: parameterArray});
      const subquerySql = dbapi.createQuery(subquery).sql;
      sqlParts.whereClauses.push('EXISTS(' + subquerySql + ')');
    }
  },
  'beliggenhed_vejnavnelinje': {
    select: function (sqlParts, sqlModel, params) {
      const sridAlias = dbapi.addSqlParameter(sqlParts, params.srid || 4326);
      return geojsonColumn(params.srid || 4326, sridAlias, 'nv.beliggenhed_vejnavnelinje');
    }

  },
  'beliggenhed_vejnavneområde': {
    select: function (sqlParts, sqlModel, params) {
      const sridAlias = dbapi.addSqlParameter(sqlParts, params.srid || 4326);
      return geojsonColumn(params.srid || 4326, sridAlias, 'nv.beliggenhed_vejnavneområde');
    }
  },
  'beliggenhed_vejtilslutningspunkter': {
    select: function (sqlParts, sqlModel, params) {
      const sridAlias = dbapi.addSqlParameter(sqlParts, params.srid || 4326);
      return geojsonColumn(params.srid || 4326, sridAlias, 'nv.beliggenhed_vejtilslutningspunkter');
    }
  },
  postnumre: {
    select: `(SELECT json_agg(json_build_object('nr', p.postnr, 'navn', p.navn))
    FROM dar1_navngivenvejpostnummerrelation_current np join dar1_postnummer_current p on np.postnummer_id = p.id
    WHERE nv.id = np.navngivenvej_id)`
  },
  geom_json: {
    select: function (sqlParts, sqlModel, params) {
      const geomColumn =
        params.geometri === 'begge' ? 'geom' :
          (params.geometri === 'vejnavnelinje' ? 'beliggenhed_vejnavnelinje' : 'beliggenhed_vejnavneområde');
      const srid = params.srid || 4326;
      const sridAlias = dbapi.addSqlParameter(sqlParts, srid);
      return geojsonColumn(srid, sridAlias, geomColumn);
    }
  },
};

Object.assign(columns, bboxVisualCenterColumns('nv'));

const regexParameterImpl = (sqlParts, params) => {
  if (params.regex) {
    const regexAlias = dbapi.addSqlParameter(sqlParts, params.regex);
    dbapi.addWhereClause(sqlParts, `navn ~ ${regexAlias}`);
  }
};

function fuzzySearchParameterImpl(sqlParts, params) {
  if (params.fuzzyq) {
    var fuzzyqAlias = dbapi.addSqlParameter(sqlParts, params.fuzzyq);
    sqlParts.whereClauses.push("nv.navn IN (select distinct ON (navn, dist) navn from (SELECT navn, navn <-> " + fuzzyqAlias + " as dist from navngivenvej ORDER BY dist LIMIT 1000) as v order by v.dist limit 100)");
    sqlParts.orderClauses.push("levenshtein(lower(navn), lower(" + fuzzyqAlias + "), 2, 1, 3)");
  }
}

const distanceParameterImpl = (sqlParts, params) => {
  // This is implemented with a JOIN
  // when using a subquery, PostgreSQL fails to utilize the spatial index
  // Probably a bug in PostgreSQL
  if (params.afstand !== undefined) {
    const idAlias = dbapi.addSqlParameter(sqlParts, params.neighborid);
    const afstandAlias = dbapi.addSqlParameter(sqlParts, params.afstand);
    sqlParts.from.push(`, (select id, geom from navngivenvej_mat) n2`);
    dbapi.addWhereClause(sqlParts, `\
n2.id = ${idAlias} \
AND ST_DWithin(nv.geom, n2.geom, ${afstandAlias})
AND NOT (nv.id = ${idAlias})`);

  }
};



var parameterImpls = [
  sqlParameterImpl.simplePropertyFilter(parameters.propertyFilter, columns),
  sqlParameterImpl.includeDeletedNavngivenVej,
  sqlParameterImpl.search(columns),
  sqlParameterImpl.autocomplete(columns, ['navn']),
  sqlParameterImpl.geomWithin('nv.geom'),
  sqlParameterImpl.reverseGeocoding('nv.geom'),
  distanceParameterImpl,
  regexParameterImpl,
  fuzzySearchParameterImpl,
  sqlParameterImpl.paging(columns, nameAndKey.key)
];

var baseQuery = function () {
  return {
    select: [],
    from: ['navngivenvej_mat nv'],
    whereClauses: [],
    orderClauses: [],
    sqlParams: []
  };
};

module.exports = sqlUtil.applyFallbackToFuzzySearch(assembleSqlModel(columns, parameterImpls, baseQuery));

registry.add('navngivenvej', 'sqlModel', undefined, module.exports);
