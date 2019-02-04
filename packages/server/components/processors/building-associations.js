const tableSchema = require('../../psql/tableModel');
const { fromMaterializations } = require('../common');

module.exports = fromMaterializations("Building-Associations",
  "Relationen mellem bygninger og adresser",
  [tableSchema.materializations.bygningtilknytninger, tableSchema.materializations.bygning_kommune]);
