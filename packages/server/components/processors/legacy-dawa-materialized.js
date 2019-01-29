const tableSchema = require('../../psql/tableModel');
const {fromMaterializations} = require('../common');

module.exports = [tableSchema.materializations.vejpunkter]
  .map(materialization =>
    fromMaterializations(materialization.table,
      `Legacy replikerings-tabel ${materialization.table}`,
      [materialization]));