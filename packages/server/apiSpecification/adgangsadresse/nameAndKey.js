
module.exports = {
  singular: 'adgangsadresse',
  plural: 'adgangsadresser',
  key: ['id']
};

var registry = require('../registry');
registry.add('adgangsadresse', 'nameAndKey', undefined, module.exports);