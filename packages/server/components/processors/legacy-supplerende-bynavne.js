const tableModels = require('../../psql/tableModel');
const { fromMaterializations } = require('../common');

module.exports = fromMaterializations('Legacy-Supplerende-Bynavn', 'Legacy supplerende bynavn API opslagstabeller',
  [tableModels.materializations.supplerendebynavne_mat,
    tableModels.materializations.supplerendebynavn_kommune_mat,
    tableModels.materializations.supplerendebynavn_postnr_mat]);
