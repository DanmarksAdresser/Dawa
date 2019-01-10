const tableSchema = require('../../psql/tableModel');
const { fromMaterializations } = require('./processor-util');

module.exports = fromMaterializations('Materialized tables for API',
  [tableSchema.materializations.adgangsadresser,
    tableSchema.materializations.enhedsadresser,
    tableSchema.materializations.adgangsadresser_mat,
    tableSchema.materializations.adresser_mat,
    tableSchema.materializations.tilknytninger_mat,
    tableSchema.materializations.navngivenvej,
    tableSchema.materializations.vejstykker,
    tableSchema.materializations.postnumre,
    tableSchema.materializations.navngivenvej_postnummer,
    tableSchema.materializations.navngivenvejkommunedel_postnr_mat,
    tableSchema.materializations.vejstykkerpostnumremat
  ]);