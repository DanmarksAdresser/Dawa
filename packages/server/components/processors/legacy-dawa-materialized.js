const tableSchema = require('../../psql/tableModel');
const { fromMaterializations } = require('./processor-util');

module.exports = fromMaterializations('Legacy materialized tables only required for replication API',
  [
    tableSchema.materializations.vejpunkter
  ]);