"use strict";

module.exports = {
  singular: 'stednavn',
  plural: 'stednavne',
  key: ['id']
};

var registry = require('../registry');
registry.add('stednavn-legacy', 'nameAndKey', undefined, module.exports);
