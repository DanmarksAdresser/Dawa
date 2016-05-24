module.exports = {
  bebyggelse: {
    table: 'bebyggelse',
    columns: {},
    textSql: (tableAlias) => `${tableAlias}.navn`,
    subdividedGeometryIndex: false
  }
};
