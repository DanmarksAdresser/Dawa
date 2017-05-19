"use strict";
const sridToPrecision = {
  "4326":  0.00000001,
  "25832": 0.01
};

const sridToDecimals = {
  "4326": 8,
  "25832": 2
};

exports.geojsonColumn = (srid, sridAlias, geomColumn) => {
  const decimals = sridToDecimals[srid];
  return `ST_AsGeoJSON(ST_Transform(${geomColumn || 'geom'}, ${sridAlias}::integer), ${decimals})`;

}

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
