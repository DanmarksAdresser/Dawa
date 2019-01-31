"use strict";

var dbapi = require('../../dbapi');
const sqlParameterImpl = require('../common/sql/sqlParameterImpl');
var sqlUtil = require('../common/sql/sqlUtil');

var selectIsoTimestamp = sqlUtil.selectIsoDate;
const postgisUtil = require('../common/sql/postgisSqlUtil');
const {bbrStatusTilDar} = require('../util');
module.exports = {
  id: {
    column: 'a_id'
  },
  status: {
    select: 'dar1_status_til_dawa_status(a_status)',
    where: (sqlParts, bbrStatus) => {
      const alias = dbapi.addSqlParameter(sqlParts, bbrStatusTilDar(bbrStatus));
      dbapi.addWhereClause(sqlParts, `a_status = ${alias}`);
    }
  },
  darstatus: {
    column: 'a_status'
  },
  husnr: sqlUtil.husnrColumn,
  etrs89koordinat_øst: {
    column: 'oest'
  },
  etrs89koordinat_nord: {
    column: 'nord'
  },
  wgs84koordinat_bredde: {
    column: postgisUtil.selectYWgs84('geom')
  },
  wgs84koordinat_længde: {
    column: postgisUtil.selectXWgs84('geom')
  },
  højde: {
    column: 'hoejde'
  },
  nøjagtighed: {
    column: 'noejagtighed'
  },
  adressepunktændringsdato: {
    column: selectIsoTimestamp('adressepunktaendringsdato')
  },
  stedid: {
    select: null,
    where: function (sqlParts, stedId, params) {
      const stedIdAlias = dbapi.addSqlParameter(sqlParts, stedId);
      if (params.stedafstand) {
        const stedAfstandAlias = dbapi.addSqlParameter(sqlParts, params.stedafstand);
        sqlParts.whereClauses.push(`geom && st_expand((select geom from steder where id = ${stedIdAlias}), ${stedAfstandAlias})
AND ST_DWithin(geom, (select geom from steder where id = ${stedIdAlias}), ${stedAfstandAlias})`)
      }
      else {
        sqlParts.whereClauses.push(`EXISTS(SELECT * FROM stedtilknytninger WHERE stedid = ${stedIdAlias} AND stedtilknytninger.adgangsadresseid = a_id)`);
      }
    }
  },
  ejerlavkode: {
    column: 'jordstykke_ejerlavkode'
  },
  matrikelnr: {
    column: 'jordstykke_matrikelnr'
  },
  ejerlavnavn: {
    column: 'jordstykke_ejerlavnavn'
  },
  esrejendomsnr: {
    column: 'jordstykke_esrejendomsnr'
  },
  bebyggelsesid: {
    select: null,
    where: function (sqlParts, parameterArray) {
      // this is a bit hackish, we add the parameters from
      // the parent query to the subquery to get
      // correct parameter indices for the subquery
      var subquery = {
        select: ["*"],
        from: ['stedtilknytninger st JOIN steder s ON st.stedid = s.id'],
        whereClauses: [`a_id  = st.adgangsadresseid AND s.hovedtype = 'Bebyggelse'`],
        orderClauses: [],
        sqlParams: sqlParts.sqlParams
      };
      var propertyFilterFn = sqlParameterImpl.simplePropertyFilter([{
        name: 'stedid',
        multi: true
      }], {});
      propertyFilterFn(subquery, {stedid: parameterArray});
      var subquerySql = dbapi.createQuery(subquery).sql;
      sqlParts.whereClauses.push('EXISTS(' + subquerySql + ')');
    }

  },
  bebyggelsestype: {
    select: null,
    where: function (sqlParts, parameterArray) {
      // this is a bit hackish, we add the parameters from
      // the parent query to the subquery to get
      // correct parameter indices for the subquery
      var subquery = {
        select: ["*"],
        from: ['stedtilknytninger st JOIN steder s ON st.stedid = s.id'],
        whereClauses: [`a_id  = st.adgangsadresseid AND s.hovedtype = 'Bebyggelse'`],
        orderClauses: [],
        sqlParams: sqlParts.sqlParams
      };
      var propertyFilterFn = sqlParameterImpl.simplePropertyFilter([{
        name: 'undertype',
        multi: true
      }], {});
      propertyFilterFn(subquery, {undertype: parameterArray});
      var subquerySql = dbapi.createQuery(subquery).sql;
      sqlParts.whereClauses.push('EXISTS(' + subquerySql + ')');
    }
  },
  x: {
    select: (sqlParts, sqlModel, params) => {
      const sridAlias = dbapi.addSqlParameter(sqlParts, params.srid || 4326);
      return postgisUtil.selectX(params.srid || 4326, sridAlias, 'geom');
    }
  },
  y: {
    select: (sqlParts, sqlModel, params) => {
      const sridAlias = dbapi.addSqlParameter(sqlParts, params.srid || 4326);
      return postgisUtil.selectY(params.srid || 4326, sridAlias, 'geom');
    }
  },
  vejpunkt_x: {
    select: (sqlParts, sqlModel, params) => {
      const sridAlias = dbapi.addSqlParameter(sqlParts, params.srid || 4326);
      return postgisUtil.selectX(params.srid || 4326, sridAlias, 'vejpunkt_geom');
    }
  },
  vejpunkt_y: {
    select: (sqlParts, sqlModel, params) => {
      const sridAlias = dbapi.addSqlParameter(sqlParts, params.srid || 4326);
      return postgisUtil.selectY(params.srid || 4326, sridAlias, 'vejpunkt_geom');
    }
  },
  vejpunkt_geom_json: {
    select: function (sqlParts, sqlModel, params) {
      const srid = params.srid || 4326;
      const sridAlias = dbapi.addSqlParameter(sqlParts, srid);
      return postgisUtil.geojsonColumn(srid, sridAlias, "vejpunkt_geom");
    }
  },
  adgangspunkt_geom_json: {
    select: function (sqlParts, sqlModel, params) {
      const srid = params.srid || 4326;
      const sridAlias = dbapi.addSqlParameter(sqlParts, srid);
      return postgisUtil.geojsonColumn(srid, sridAlias, "geom");
    }
  },
  geom_json: {
    select: function (sqlParts, sqlModel, params) {
      const srid = params.srid || 4326;
      const sridAlias = dbapi.addSqlParameter(sqlParts, srid);
      return postgisUtil.adgangsadresseGeojsonColumn(srid, sridAlias, params);
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
  nedlagt: {
    select: selectIsoTimestamp('a_nedlagt')
  },
  vejpunkt_nøjagtighed: {
    column: 'vejpunkt_noejagtighedsklasse'
  },
  tsv: {
    column: 'tsv'
  }
};
