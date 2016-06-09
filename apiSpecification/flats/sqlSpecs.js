module.exports = {
  bebyggelse: {
    table: 'bebyggelser',
    columns: {},
    textSql: (tableAlias) => `${tableAlias}.navn`,
    subdividedGeometryIndex: false
  }
};
