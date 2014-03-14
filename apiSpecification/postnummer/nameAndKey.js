module.exports = {
  plural: 'postnumre',
  key: ['nr']
};

var registry = require('../registry');
registry.add('postnummer', 'nameAndKey', undefined, module.exports);