"use strict";

var registry = require('../registry');

module.exports = {
  bygning: {
    singular: 'bygning',
    singularSpecific: 'bygningen',
    plural: 'bygninger',
    prefix: 'bygnings',
    key: ['ois_id'],
    table: 'ois_bygning',
    filterableFields: ['id', 'adgangsadresseid']
  }
};

Object.keys(module.exports).forEach(function(entityName) {
  registry.add(entityName, 'nameAndKey', null, module.exports[entityName]);
});