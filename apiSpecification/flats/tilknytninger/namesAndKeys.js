"use strict";

const _ = require('underscore');
const flats = require('../flats');
const registry = require('../../registry');
const tilknytninger = require('./tilknytninger');

module.exports = _.mapObject(flats, (flat, flatName)=> {
  var name = flat.prefix + 'tilknytning';
  const tilknytningSpec = tilknytninger[flatName];
  const keyFieldNames = tilknytningSpec.keyFieldNames;
  return {
    singular: name,
    plural: name + 'er',
    key: ['adgangsadresseid'].concat(flat.key.map(keyName => keyFieldNames[keyName]))
  };
});

_.each(module.exports, function(nameAndKey) {
  registry.add(nameAndKey.singular, 'nameAndKey', undefined, nameAndKey);
});
