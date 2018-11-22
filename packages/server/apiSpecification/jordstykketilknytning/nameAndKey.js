module.exports = {
  singular: 'jordstykketilknytning',
  plural: 'jordstykketilknytninger',
  key: ['ejerlavkode', 'matrikelnr', 'adgangsadresseid']
};

const registry = require('../registry');
registry.add('jordstykketilknytning', 'nameAndKey', undefined, module.exports);
