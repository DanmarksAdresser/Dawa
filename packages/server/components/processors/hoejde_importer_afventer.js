const tableSchema = require('../../psql/tableModel');
const { fromMaterializations } = require('../common');

module.exports = fromMaterializations("hoejde_importer_afventer",
  "Tabel med adresser som mangler at få beregnet ny højde",
  [tableSchema.materializations.hoejde_importer_afventer]);
