module.exports = {
  singular: 'supplerendebynavn',
  plural: 'supplerendebynavne',
  key: ['navn']
};

var registry = require('../registry');
registry.add('supplerendebynavn-old', 'nameAndKey', undefined, module.exports);