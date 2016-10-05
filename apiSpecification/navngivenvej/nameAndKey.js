"use strict";

module.exports =  {
  singular: 'navngivenvej',
  plural: 'navngivneveje',
  key: ['id']
};

var registry = require('../registry');
registry.add('navngivenvej', 'nameAndKey', undefined, module.exports);
