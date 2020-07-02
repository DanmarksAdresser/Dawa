"use strict";
const sridToDecimals = {
  "4326": 8,
  "25832": 3
};

const dbapi = require('../../../dbapi');

exports.bboxVisualCenterColumns = (tableAlias) => {
  const prefix = tableAlias ? `${tableAlias}.` : '';
  return {
    bbox_xmin: {
      select: function (sqlParts, sqlModel, params) {
        const sridAlias = dbapi.addSqlParameter(sqlParts, params.srid || 4326);
        return exports.selectSnappedPoint(params.srid || 4326, sridAlias, `${prefix}bbox`, 'ST_XMin');
      }
    },
    bbox_ymin: {
      select: function (sqlParts, sqlModel, params) {
        const sridAlias = dbapi.addSqlParameter(sqlParts, params.srid || 4326);
        return exports.selectSnappedPoint(params.srid || 4326, sridAlias, `${prefix}bbox`, 'ST_YMin');
      }
    },
    bbox_xmax: {
      select: function (sqlParts, sqlModel, params) {
        const sridAlias = dbapi.addSqlParameter(sqlParts, params.srid || 4326);
        return exports.selectSnappedPoint(params.srid || 4326, sridAlias, `${prefix}bbox`, 'ST_XMax');
      }
    },
    bbox_ymax: {
      select: function (sqlParts, sqlModel, params) {
        const sridAlias = dbapi.addSqlParameter(sqlParts, params.srid || 4326);
        return exports.selectSnappedPoint(params.srid || 4326, sridAlias, `${prefix}bbox`, 'ST_YMax');
      }
    },
    visueltcenter_x: {
      select: (sqlParts, sqlModel, params) => {
        const sridAlias = dbapi.addSqlParameter(sqlParts, params.srid || 4326);
        return exports.selectX(params.srid || 4326, sridAlias, `${prefix}visueltcenter`);
      }
    },
    visueltcenter_y: {
      select: (sqlParts, sqlModel, params) => {
        const sridAlias = dbapi.addSqlParameter(sqlParts, params.srid || 4326);
        return exports.selectY(params.srid || 4326, sridAlias, `${prefix}visueltcenter`);
      }
    }
  }
};

exports.geojsonColumn = (srid, sridAlias, geomColumn) => {
  const decimals = sridToDecimals[srid];
  return `ST_AsGeoJSON(ST_Transform(${geomColumn || 'geom'}, ${sridAlias}::integer), ${decimals})`;
};

exports.bboxColumn = (srid, sridAlias, bboxColumn) => {
  const decimals = sridToDecimals[srid];
  return `ST_AsGeoJSON(ST_Transform(${bboxColumn || 'bbox'}, ${sridAlias}::integer), ${decimals})`;
};

exports.adgangsadresseGeojsonColumn = (srid, sridAlias, params) => {
  const geomColumn = params.geometri === 'vejpunkt' ? 'vejpunkt_geom' : 'geom';
  const decimals = sridToDecimals[srid];
  if(geomColumn === 'geom') {
    return `CASE WHEN hoejde IS NULL 
      THEN ST_AsGeoJSON(ST_Transform(${geomColumn}, ${sridAlias}::integer), ${decimals})
      ELSE ST_AsGeoJSON(ST_Transform(ST_SetSRID(st_makepoint(st_x(${geomColumn}), st_y(${geomColumn}), hoejde), 25832), ${sridAlias}::integer), ${decimals})
      END`;
  }
  else {
    return `ST_AsGeoJSON(ST_Transform(${geomColumn}, ${sridAlias}::integer), ${decimals})`;
  }
};

exports.selectXWgs84 = geomColumn => {
  const decimals = sridToDecimals[4326];
  return `round(ST_X(ST_Transform(${geomColumn}, 4326))::numeric, ${decimals})`;
}

exports.selectYWgs84 = geomColumn => {
  const decimals = sridToDecimals[4326];
  return `round(ST_Y(ST_Transform(${geomColumn}, 4326))::numeric, ${decimals})`;
}

exports.selectX = (srid, sridAlias, geomColumn) => {
  return exports.selectSnappedPoint(srid, sridAlias, geomColumn, 'ST_X');
};

exports.selectY = (srid, sridAlias, geomColumn) => {
  return exports.selectSnappedPoint(srid, sridAlias, geomColumn, 'ST_Y');
};

exports.selectSnappedPoint = (srid, sridAlias, geomColumn, postgisFn) => {
  const decimals = sridToDecimals[srid];
  return `round(${postgisFn}(ST_Transform(${geomColumn}, ${sridAlias}::integer))::numeric, ${decimals})`;
};
