const wkt = require('terraformer-wkt-parser');

const geomDistinctClause = (a, b) => `${a} IS DISTINCT FROM ${b} OR NOT ST_Equals(${a}, ${b})`;
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
    distinctClause: geomDistinctClause,
    toCsv: geojsonToCsv
  },
  geometry: {
    sqlType: 'geometry(geometry, 25832)',
    distinctClause: geomDistinctClause,
    toCsv: geojsonToCsv
  }
};

module.exports = defaultBindings;