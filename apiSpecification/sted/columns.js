const dbapi = require('../../dbapi');
const postgisSqlUtil = require('../common/sql/postgisSqlUtil');
const sqlParameterImpl = require('../common/sql/sqlParameterImpl');

module.exports = {
  id: {
    column: 'steder.id'
  },
  hovedtype: {
    column: 'steder.hovedtype'
  },
  undertype: {
    column: 'steder.undertype'
  },
  indbyggerantal: {
    column: 'steder.indbyggerantal'
  },
  bebyggelseskode: {
    column: 'steder.bebyggelseskode'
  },
  ændret: {
    column: 'steder.ændret'
  },
  geo_ændret: {
    column: 'geo_ændret'
  },
  geo_version: {
    column: 'geo_version'
  },
  geom_json: {
    select: function (sqlParts, sqlModel, params) {
      const sridAlias = dbapi.addSqlParameter(sqlParts, params.srid || 4326);
      return postgisSqlUtil.geojsonColumn(params.srid || 4326, sridAlias);
    }
  },
  visueltcenter: {
    select: function (sqlParts, sqlModel, params) {
      const sridAlias = dbapi.addSqlParameter(sqlParts, params.srid || 4326);
      return postgisSqlUtil.geojsonColumn(params.srid || 4326, sridAlias, 'visueltcenter');
    }
  },
  visueltcenter_x: {
    select: (sqlParts, sqlModel, params) => {
      const sridAlias = dbapi.addSqlParameter(sqlParts, params.srid || 4326);
      return postgisSqlUtil.selectX(params.srid || 4326, sridAlias, 'visueltcenter');
    }
  },
  visueltcenter_y: {
    select: (sqlParts, sqlModel, params) => {
      const sridAlias = dbapi.addSqlParameter(sqlParts, params.srid || 4326);
      return postgisSqlUtil.selectY(params.srid || 4326, sridAlias, 'visueltcenter');
    }
  },
  kommunekode: {
    select: null,
      where: function (sqlParts, parameterArray) {
      // this is a bit hackish, we add the parameters from
      // the parent query to the subquery to get
      // correct parameter indices for the subquery
      const subquery = {
        select: ["*"],
        from: ['sted_kommune'],
        whereClauses: ['steder.id  = sted_kommune.stedid'],
        orderClauses: [],
        sqlParams: sqlParts.sqlParams
      };
      const propertyFilterFn = sqlParameterImpl.simplePropertyFilter([{
        name: 'kommunekode',
        multi: true
      }], {});
      propertyFilterFn(subquery, {kommunekode: parameterArray});
      const subquerySql = dbapi.createQuery(subquery).sql;
      sqlParts.whereClauses.push(`EXISTS(${subquerySql})`);
    }
  },
  primærtnavn: {
    column: 'p_stednavn.navn'
  },
  primærnavnestatus: {
    column: 'p_stednavn.navnestatus'
  },
  brofast: {
    select: `(SELECT b.brofast FROM brofasthed b WHERE b.stedid = steder.id)`
  },
  sekundærenavne: {
    select: `(select json_agg(json_build_object('navn', navn, 'navnestatus', navnestatus))
    FROM stednavne sek WHERE steder.id = sek.stedid AND sek.brugsprioritet = 'sekundær')`
  },
  kommuner: {
    select: `(select json_agg((kode, navn)::kommuneref order by kode) 
     FROM sted_kommune sk
     JOIN kommuner k
     ON sk.kommunekode = k.kode
     WHERE sk.stedid = steder.id)`
  }
}