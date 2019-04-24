"use strict";
const sridToPrecision = {
  "4326":  0.00000001,
  "25832": 0.001
};

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
  const precision = sridToPrecision["4326"];
  return `ST_X(ST_SnapToGrid(ST_Transform(${geomColumn}, 4326), ${precision}))`;
}

exports.selectYWgs84 = geomColumn => {
  const precision = sridToPrecision[4326];
  return `ST_Y(ST_SnapToGrid(ST_Transform(${geomColumn}, 4326), ${precision}))`;
}

exports.selectX = (srid, sridAlias, geomColumn) => {
  const precision = sridToPrecision[srid];
  return `ST_X(ST_SnapToGrid(ST_Transform(${geomColumn}, ${sridAlias}::integer), ${precision}))`;
};

exports.selectY = (srid, sridAlias, geomColumn) => {
  const precision = sridToPrecision[srid];
  return `ST_Y(ST_SnapToGrid(ST_Transform(${geomColumn}, ${sridAlias}::integer), ${precision}))`;
};

exports.selectSnappedPoint = (srid, sridAlias, geomColumn, postgisFn) => {
  const precision = sridToPrecision[srid];
  return `${postgisFn}(ST_SnapToGrid(ST_Transform(${geomColumn}, ${sridAlias}::integer), ${precision}))`;
};
