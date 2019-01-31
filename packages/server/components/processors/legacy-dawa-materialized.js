const tableSchema = require('../../psql/tableModel');
const {fromMaterializations} = require('../common');

module.exports = [
  tableSchema.materializations.vejpunkter,
  tableSchema.materializations.vejstykker,
  tableSchema.materializations.navngivenvej,
  tableSchema.materializations.adgangsadresser,
  tableSchema.materializations.enhedsadresser,
].map(materialization =>
    fromMaterializations(materialization.table,
      `Legacy replikerings-tabel ${materialization.table}`,
      [materialization]));