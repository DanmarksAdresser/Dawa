const tableSchema = require('../../psql/tableModel');
const { fromMaterializations } = require('./processor-util');

module.exports = fromMaterializations("Ikke brofaste adresser", [tableSchema.materializations.ikke_brofaste_adresser]);
