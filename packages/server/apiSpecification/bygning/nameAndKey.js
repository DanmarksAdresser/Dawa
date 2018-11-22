const registry = require('../registry');

module.exports = {
  singular: 'bygning',
  plural: 'bygninger',
  singularSpecific: 'bygningen',
  prefix: 'bygnings',
  key: ['id']
};

registry.add('bygning', 'nameAndKey', undefined, module.exports);
