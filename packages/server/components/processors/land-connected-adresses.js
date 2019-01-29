const tableSchema = require('../../psql/tableModel');
const { fromMaterializations } = require('../common');

module.exports = fromMaterializations(
  "Land-Connected-Addresses",
  "Ikke brofaste adresser",
  [tableSchema.materializations.ikke_brofaste_adresser]);
