const tableSchema = require('../../psql/tableModel');
const { fromMaterializations } = require('../common');

module.exports = fromMaterializations("Heights",
  "Tabel med adressers beregnede højder",
  [tableSchema.materializations.hoejder]);
