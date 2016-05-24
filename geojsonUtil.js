"use strict";



exports.toPostgresqlGeometry = (geojsonGeometry, hasZCoordinate, createMultiGeometry) => {
  if(!geojsonGeometry) {
    return null;
  }

  let coordinates = geojsonGeometry.coordinates;
  let type = geojsonGeometry.type;
  if(createMultiGeometry && !geojsonGeometry.type.startsWith('Multi')) {
    return exports.toPostgresqlGeometry({
      type: 'Multi' + geojsonGeometry.type,
      coordinates: [coordinates]
    }, hasZCoordinate, true);
  }

  const stringifyPoints = points => {
    if(!Array.isArray(points[0])) {
      return points.join(' ');
    }
    else {
      return '(' + points.map(stringifyPoints).join(', ') + ')';
    }
  };

  const srid = 25832;

  return `SRID=${srid}; ${type}${hasZCoordinate ? 'Z' : ''}${stringifyPoints(coordinates)}`;
};
