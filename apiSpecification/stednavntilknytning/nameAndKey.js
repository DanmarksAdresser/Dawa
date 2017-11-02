module.exports = {
  singular: 'stednavntilknytning',
  plural: 'stednavntilknytninger',
  key: ['stednavn_id', 'adgangsadresse_id']
};

var registry = require('../registry');
registry.add('stednavntilknytning', 'nameAndKey', undefined, module.exports);
