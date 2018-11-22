"use strict";

const dbapi = require('../../dbapi');
const postgisSqlUtil = require('../common/sql/postgisSqlUtil');
module.exports = {
  bygningspunkt: (alias) => ({
    koordinater_x: {
      select: (sqlParts, sqlModel, params) => {
        const sridAlias = dbapi.addSqlParameter(sqlParts, params.srid || 4326);
        return postgisSqlUtil.selectX(params.srid || 4326, sridAlias, 'geom');

      }
    },
    koordinater_y: {
      select: (sqlParts, sqlModel, params) => {
        const sridAlias = dbapi.addSqlParameter(sqlParts, params.srid || 4326);
        return postgisSqlUtil.selectY(params.srid || 4326, sridAlias, 'geom');
      }
    }
  })
};
