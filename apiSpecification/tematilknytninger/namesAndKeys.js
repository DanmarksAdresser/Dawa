"use strict";

var _ = require('underscore');
var temaer = require('../temaer/temaer');
var columnMappings = require('../replikering/columnMappings');
var registry = require('../registry');

module.exports = temaer.reduce(function(memo, tema) {
  var name = tema.prefix + 'tilknytning';
  memo[name] = {
    singular: name,
    plural: name + 'er',
    key: _.pluck(columnMappings[tema.prefix + 'tilknytning'], 'name')
  };
  return memo;
}, {});

_.each(module.exports, function(nameAndKey) {
  registry.add(nameAndKey.singular, 'nameAndKey', undefined, nameAndKey);
});