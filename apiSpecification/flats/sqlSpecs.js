module.exports = {
  bebyggelse: {
    table: 'bebyggelser',
    columns: {},
    textSql: (tableAlias) => `${tableAlias}.navn`,
    subdividedGeometryIndex: true,
    geometryType: 'MultiPolygon'
  },
  jordstykke: {
    table: 'jordstykker',
    columns: {},
    subdividedGeometryIndex: false,
    geometryType: 'Polygon'
  }
};
