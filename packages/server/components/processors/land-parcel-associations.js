const tableSchema = require('../../psql/tableModel');
const {fromMaterializations} = require('../common');

module.exports = fromMaterializations("Land-Parcel-Relation",
  "Jordstykketilknytninger", [tableSchema.materializations.jordstykker_adgadr]);
