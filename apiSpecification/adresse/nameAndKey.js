module.exports = {
  plural: 'adresser',
  key: ['id']
};

var registry = require('../registry');
registry.add('adresse', 'nameAndKey', undefined, module.exports);