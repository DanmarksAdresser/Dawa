const tableSchema = require('../../psql/tableModel');
const { fromMaterializations } = require('../common');

module.exports = [tableSchema.materializations.navngivenvejkommunedel_postnr_mat,
  tableSchema.materializations.vejstykkerpostnumremat
].map(materialization => fromMaterializations(
  materialization.table,
  `Opslagstabel ${materialization.table}`,
  [materialization]
));