const tableSchema = require('../../psql/tableModel');
const { fromMaterializations } = require('../common');

module.exports = [tableSchema.materializations.navngivenvejkommunedel_postnr_mat,
  tableSchema.materializations.supplerendebynavn2_postnr,
  tableSchema.materializations.vejstykkerpostnumremat,
  tableSchema.materializations.postnumre_kommunekoder_mat,
  tableSchema.materializations.vejnavne_mat,
    tableSchema.materializations.navngivenvejpostnummerrelation,
    tableSchema.materializations.vejnavnpostnummerrelation,
  tableSchema.materializations.jordstykker
].map(materialization => fromMaterializations(
  materialization.table,
  `Opslagstabel ${materialization.table}`,
  [materialization]
));
