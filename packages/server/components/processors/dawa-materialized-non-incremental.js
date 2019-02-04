const tableSchema = require('../../psql/tableModel');
const { fromMaterializations } = require('../common');

module.exports = [tableSchema.materializations.navngivenvejkommunedel_postnr_mat,
  tableSchema.materializations.supplerendebynavn2_postnr,
  tableSchema.materializations.vejstykkerpostnumremat,
  tableSchema.materializations.postnumre_kommunekoder_mat
].map(materialization => fromMaterializations(
  materialization.table,
  `Opslagstabel ${materialization.table}`,
  [materialization]
));