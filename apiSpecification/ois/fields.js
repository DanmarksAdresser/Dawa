const fieldsUtil = require('../common/fieldsUtil');
const sqlModels = require('./sqlModels');
const fieldSpec = require('./fieldSpec');

for(let name of Object.keys(fieldSpec)) {
  const fields = fieldSpec[name];
  fieldsUtil.applySelectability(fields, sqlModels[name]);
  fieldsUtil.normalize(fields);
  exports[name] = fields;
}
