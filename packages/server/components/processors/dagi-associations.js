const tableSchema = require('../../psql/tableModel');
const {fromMaterializations} = require('../common');
const temaModels = require('../../dagiImport/temaModels');


module.exports = temaModels.modelList
  .filter(model => !model.withoutTilknytninger)
  .map(model => {
    const materialization = tableSchema.materializations[model.tilknytningTable];
    return fromMaterializations(`${model.singular}-tilknytning`, `Relation mellem adresse og ${model.name}`, [materialization]);

  });
