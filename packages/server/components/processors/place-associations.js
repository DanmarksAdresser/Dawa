const tableSchema = require('../../psql/tableModel');
const { fromMaterializations } = require('./processor-util');

module.exports = fromMaterializations("Stedtilknytninger", [tableSchema.materializations.stedtilknytninger]);
