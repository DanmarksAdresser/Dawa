const tableSchema = require('../../psql/tableModel');
const { fromMaterializations } = require('./processor-util');
const temaModels = require('../../dagiImport/temaModels');

const materializations =   temaModels.modelList
  .filter(model => !model.withoutTilknytninger)
  .map(model =>  tableSchema.materializations[model.tilknytningTable]);

module.exports = fromMaterializations("DAGI tilknytninger", materializations);
