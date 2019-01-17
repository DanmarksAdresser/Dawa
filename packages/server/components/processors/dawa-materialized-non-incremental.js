const tableSchema = require('../../psql/tableModel');
const { fromMaterializations } = require('./processor-util');

module.exports = fromMaterializations('Non-incremental materialized tables for API',
  [tableSchema.materializations.navngivenvejkommunedel_postnr_mat,
    tableSchema.materializations.vejstykkerpostnumremat
  ]);

// A bit hackish, but these must execute non-incrementally.
delete module.exports.executeIncrementally;