"use strict";
var dbapi = require('../../dbapi');
const sqlParameterImpl = require('../common/sql/sqlParameterImpl');
var sqlUtil = require('../common/sql/sqlUtil');

var selectIsoTimestamp = sqlUtil.selectIsoDate;
const postgisUtil = require('../common/sql/postgisSqlUtil');

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
  geom_json: {
    select: function(sqlParts, sqlModel, params) {
      const srid = params.srid || 4326;
      const sridAlias = dbapi.addSqlParameter(sqlParts, srid);
      return postgisUtil.adgangsadresseGeojsonColumn(srid, sridAlias);
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
