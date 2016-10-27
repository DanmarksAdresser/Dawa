"use strict";
var dbapi = require('../../dbapi');
const sqlParameterImpl = require('../common/sql/sqlParameterImpl');
var sqlUtil = require('../common/sql/sqlUtil');

var selectIsoTimestamp = sqlUtil.selectIsoDate;

module.exports =  {
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
    column: 'ST_Y(ST_Transform(geom, 4326))'
  },
  wgs84koordinat_længde: {
    column: 'ST_X(ST_Transform(geom, 4326))'
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
  bebyggelsesid: {
    select: null,
    where: function (sqlParts, parameterArray) {
      // this is a bit hackish, we add the parameters from
      // the parent query to the subquery to get
      // correct parameter indices for the subquery
      var subquery = {
        select: ["*"],
        from: ['bebyggelser_adgadr'],
        whereClauses: ['a_id  = bebyggelser_adgadr.adgangsadresse_id'],
        orderClauses: [],
        sqlParams: sqlParts.sqlParams
      };
      var propertyFilterFn = sqlParameterImpl.simplePropertyFilter([{
        name: 'bebyggelse_id',
        multi: true
      }], {});
      propertyFilterFn(subquery, {bebyggelse_id: parameterArray});
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
        from: ['bebyggelser_adgadr JOIN bebyggelser ON bebyggelser_adgadr.bebyggelse_id = bebyggelser.id'],
        whereClauses: ['a_id  = bebyggelser_adgadr.adgangsadresse_id'],
        orderClauses: [],
        sqlParams: sqlParts.sqlParams
      };
      var propertyFilterFn = sqlParameterImpl.simplePropertyFilter([{
        name: 'type',
        multi: true
      }], {});
      propertyFilterFn(subquery, {type: parameterArray});
      var subquerySql = dbapi.createQuery(subquery).sql;
      sqlParts.whereClauses.push('EXISTS(' + subquerySql + ')');
    }
  },
  geom_json: {
    select: function(sqlParts, sqlModel, params) {
      var sridAlias = dbapi.addSqlParameter(sqlParts, params.srid || 4326);
      return `CASE WHEN hoejde IS NULL 
      THEN ST_AsGeoJSON(ST_Transform(geom, ${sridAlias}::integer))
      ELSE ST_AsGeoJSON(ST_Transform(ST_SetSRID(st_makepoint(st_x(geom), st_y(geom), hoejde), 25832), ${sridAlias}::integer))
      END`;
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
  tsv: {
    column: 'tsv'
  }
};
