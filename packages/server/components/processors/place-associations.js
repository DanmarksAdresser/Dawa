const tableSchema = require('../../psql/tableModel');
const { fromMaterializations } = require('../common');

module.exports = fromMaterializations('Place-Relations',"Stedtilknytninger", [tableSchema.materializations.stedtilknytninger]);
