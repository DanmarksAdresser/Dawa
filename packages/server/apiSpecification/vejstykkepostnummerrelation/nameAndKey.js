"use strict";

module.exports = {
  singular: 'vejstykkepostnummerrelation',
  plural: 'vejstykkepostnummerrelationer',
  key: ['kommunekode', 'vejkode', 'postnr']
};

var registry = require('../registry');
registry.add('vejstykkepostnummerrelation', 'nameAndKey', undefined, module.exports);
