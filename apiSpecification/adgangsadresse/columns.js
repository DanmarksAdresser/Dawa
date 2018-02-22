"use strict";

var dbapi = require('../../dbapi');
const sqlParameterImpl = require('../common/sql/sqlParameterImpl');
var sqlUtil = require('../common/sql/sqlUtil');

var selectIsoTimestamp = sqlUtil.selectIsoDate;
const postgisUtil = require('../common/sql/postgisSqlUtil');

module.exports = {
  id: {
    column: 'a_id'
  },
  status: {
    column: 'a_objekttype'
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
  stednavnid: {
    select: null,
    where: function (sqlParts, stednavnId, params) {
      const stednavnIdAlias = dbapi.addSqlParameter(sqlParts, stednavnId);
      if (params.stednavnafstand) {
        const stednavnAfstandAlias = dbapi.addSqlParameter(sqlParts, params.stednavnafstand);
        sqlParts.whereClauses.push(`geom && st_expand((select geom from stednavne where id = ${stednavnIdAlias}), ${stednavnAfstandAlias})
AND ST_DWithin(geom, (select geom from stednavne where id = ${stednavnIdAlias}), ${stednavnAfstandAlias})`)
      }
      else {
        sqlParts.whereClauses.push(`EXISTS(SELECT * FROM stednavne_adgadr WHERE stednavn_id = ${stednavnIdAlias} AND stednavne_adgadr.adgangsadresse_id = a_id)`);
      }
    }
  },
  bebyggelsesid: {
    select: null,
    where: function (sqlParts, parameterArray) {
      // this is a bit hackish, we add the parameters from
      // the parent query to the subquery to get
      // correct parameter indices for the subquery
      var subquery = {
        select: ["*"],
        from: ['stednavne_adgadr JOIN stednavne ON stednavne_adgadr.stednavn_id = stednavne.id'],
        whereClauses: [`a_id  = stednavne_adgadr.adgangsadresse_id AND stednavne.hovedtype = 'Bebyggelse'`],
        orderClauses: [],
        sqlParams: sqlParts.sqlParams
      };
      var propertyFilterFn = sqlParameterImpl.simplePropertyFilter([{
        name: 'stednavn_id',
        multi: true
      }], {});
      propertyFilterFn(subquery, {stednavn_id: parameterArray});
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
        from: ['stednavne_adgadr JOIN stednavne ON stednavne_adgadr.stednavn_id = stednavne.id'],
        whereClauses: [`a_id  = stednavne_adgadr.adgangsadresse_id AND stednavne.hovedtype = 'Bebyggelse'`],
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
  vejpunkt_nøjagtighed: {
    column: 'vejpunkt_noejagtighedsklasse'
  },
  tsv: {
    column: 'tsv'
  }
};
