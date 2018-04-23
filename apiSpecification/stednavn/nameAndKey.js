"use strict";

module.exports = {
  singular: 'stednavn',
  plural: 'stednavne',
  key: ['sted_id', 'navn']
};

var registry = require('../registry');
registry.add('stednavn', 'nameAndKey', undefined, module.exports);
