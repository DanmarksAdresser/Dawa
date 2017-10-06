"use strict";

module.exports = {
  singular: 'stednavn',
  plural: 'stednavne',
  key: ['id']
};

var registry = require('../registry');
registry.add('stednavn', 'nameAndKey', undefined, module.exports);
