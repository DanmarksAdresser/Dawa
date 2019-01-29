const tableSchema = require('../../psql/tableModel');
const { fromMaterializations } = require('../common');

module.exports = [tableSchema.materializations.adgangsadresser,
  tableSchema.materializations.enhedsadresser,
  tableSchema.materializations.adgangsadresser_mat,
  tableSchema.materializations.adresser_mat,
  tableSchema.materializations.tilknytninger_mat,
  tableSchema.materializations.navngivenvej,
  tableSchema.materializations.vejstykker,
  tableSchema.materializations.postnumre,
  tableSchema.materializations.navngivenvej_postnummer
].map(materialization => fromMaterializations(`${materialization.table}`,
  `Opslagstabel ${materialization.table}`,
  [materialization])
);