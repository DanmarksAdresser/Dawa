const tableSchema = require('../../psql/tableModel');
const { fromMaterializations } = require('../common');

module.exports = fromMaterializations('steder_geom',"Stedgeometrier til replikering", [tableSchema.materializations.steder_geom]);
