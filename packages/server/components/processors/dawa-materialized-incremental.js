const tableSchema = require('../../psql/tableModel');
const { fromMaterializations } = require('../common');

module.exports = [tableSchema.materializations.navngivenvej_mat,
  tableSchema.materializations.navngivenvejkommunedel_mat,
  tableSchema.materializations.adgangsadresser_mat,
  tableSchema.materializations.adresser_mat,
  tableSchema.materializations.tilknytninger_mat,
  tableSchema.materializations.postnumre,
  tableSchema.materializations.navngivenvej_postnummer,
  tableSchema.materializations.vejstykkerpostnumremat,
  tableSchema.materializations.ikke_brofaste_adresser,
  tableSchema.materializations.jordstykker
].map(materialization => fromMaterializations(`${materialization.table}`,
  `Opslagstabel ${materialization.table}`,
  [materialization])
);