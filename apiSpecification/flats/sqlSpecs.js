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
    columns: {
      ejerlavnavn: {
        column: "ejerlav.navn"
      }
    },
    subdividedGeometryIndex: false,
    geometryType: 'Polygon',
    baseQuery: () => ({
      select: [],
      from: [`jordstykker LEFT JOIN ejerlav ON jordstykker.ejerlavkode = ejerlav.kode`],
      whereClauses: [],
      orderClauses: [],
      sqlParams: []
    }),
  }
};
