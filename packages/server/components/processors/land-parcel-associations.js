const tableSchema = require('../../psql/tableModel');
const { fromMaterializations } = require('./processor-util');

module.exports = fromMaterializations("Jordstykketilknytninger", [tableSchema.materializations.jordstykker_adgadr]);
