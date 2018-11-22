"use strict";

module.exports = {
  singular: 'bebyggelse',
  plural: 'bebyggelser',
  key: ['id']
};

var registry = require('../registry');
registry.add('bebyggelse', 'nameAndKey', undefined, module.exports);
