module.exports = {
  singular: 'adresse',
  plural: 'adresser',
  key: ['id']
};

var registry = require('../registry');
registry.add('adresse', 'nameAndKey', undefined, module.exports);