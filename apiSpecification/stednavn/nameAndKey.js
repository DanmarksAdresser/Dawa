"use strict";

module.exports = {
  singular: 'stednavn',
  plural: 'stednavne2',
  key: ['sted_id', 'navn']
};

var registry = require('../registry');
registry.add('stednavn', 'nameAndKey', undefined, module.exports);
