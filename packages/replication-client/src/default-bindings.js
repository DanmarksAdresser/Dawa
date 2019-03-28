const wkt = require('terraformer-wkt-parser');

const geojsonToCsv = value => {
  if(value) {
    return `SRID=25832;${wkt.convert(value)}`;
  }
  else {
    return null;
  }
};
const defaultBindings = {
  integer: {
    sqlType: 'integer'
  },
  real: {
    sqlType: 'double precision'
  },
  boolean: {
    sqlType: 'boolean'
  },
  string: {
    sqlType: 'text'
  },
  uuid: {
    sqlType: 'uuid'
  },
  timestamp: {
    sqlType: 'timestamptz'
  },
  localdatetime: {
    sqlType: 'timestamp'
  },
  point2d: {
    sqlType: 'geometry(point, 25832)',
    toCsv: geojsonToCsv
  },
  geometry: {
    sqlType: 'geometry(geometry, 25832)',
    toCsv: geojsonToCsv
  },
  geometry3d: {
    sqlType: 'geometry(geometryz, 25832)',
    toCsv: geojsonToCsv
  }
};

module.exports = defaultBindings;