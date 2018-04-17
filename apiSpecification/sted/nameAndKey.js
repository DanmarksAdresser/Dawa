"use strict";

module.exports = {
  singular: 'sted',
  plural: 'steder',
  key: ['id']
};

var registry = require('../registry');
registry.add('sted', 'nameAndKey', undefined, module.exports);
