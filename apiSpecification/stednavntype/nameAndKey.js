module.exports = {
  singular: 'stednavntype',
  plural: 'stednavntyper',
  key: ['hovedtype']
};

var registry = require('../registry');
registry.add('stednavntype', 'nameAndKey', undefined, module.exports);
