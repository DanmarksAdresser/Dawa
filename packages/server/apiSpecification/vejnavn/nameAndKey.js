module.exports = {
  singular: 'vejnavn',
  plural: 'vejnavne',
  key: ['navn']
};

var registry = require('../registry');
registry.add('vejnavn', 'nameAndKey', undefined, module.exports);