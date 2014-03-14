"use strict";

module.exports =  {
  name: 'vejstykke',
  plural: 'vejstykker',
  key: ['kommunekode', 'kode']
};

var registry = require('../registry');
registry.add('vejstykke', 'nameAndKey', undefined, module.exports);