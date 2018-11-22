const registry = require('../registry');

module.exports = {
  singular: 'jordstykke',
  plural: 'jordstykker',
  singularSpecifik: 'jordstykket',
  prefix: 'jordstykke',
  key: ['ejerlavkode', 'matrikelnr']
};

registry.add('jordstykke', 'nameAndKey', undefined, module.exports);
