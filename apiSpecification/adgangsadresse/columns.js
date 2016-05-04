"use strict";
var dbapi = require('../../dbapi');
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
  geom_json: {
    select: function(sqlParts, sqlModel, params) {
      var sridAlias = dbapi.addSqlParameter(sqlParts, params.srid || 4326);
      return `CASE WHEN hoejde IS NULL 
      THEN ST_AsGeoJSON(ST_Transform(geom, ${sridAlias}))
      ELSE ST_AsGeoJSON(ST_Transform(ST_SetSRID(st_makepoint(st_x(geom), st_y(geom), hoejde), 25832), ${sridAlias}))
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
