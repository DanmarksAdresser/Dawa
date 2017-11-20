const fieldsUtil = require('../common/fieldsUtil');
const sqlModels = require('./sqlModels');
const fieldSpec = require('./fieldSpec');

for(let variant of ['public', 'full']) {
  exports[variant] = {};
  for(let name of Object.keys(fieldSpec[variant])) {
    const fields = fieldSpec[variant][name];
    fieldsUtil.applySelectability(fields, sqlModels[name]);
    fieldsUtil.normalize(fields);
    exports[variant][name] = fields;
  }
}
