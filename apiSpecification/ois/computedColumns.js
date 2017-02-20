"use strict";

const dbapi = require('../../dbapi');
module.exports = {
  bygningspunkt: (alias) => ({
    koordinater_x: {
      select: (sqlParts, sqlModel, params) => {
        const sridAlias = dbapi.addSqlParameter(sqlParts, params.srid || 4326);
        return `ST_X(ST_Transform(${alias}.geom,${sridAlias}::integer))`;

      }
    },
    koordinater_y: {
      select: (sqlParts, sqlModel, params) => {
        const sridAlias = dbapi.addSqlParameter(sqlParts, params.srid || 4326);
        return `ST_Y(ST_Transform(${alias}.geom,${sridAlias}::integer))`;
      }
    }
  })
};
