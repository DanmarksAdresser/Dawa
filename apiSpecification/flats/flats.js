"use strict";

const registry = require('../registry');

module.exports = {
  bebyggelse: {
    singular: 'bebyggelse',
    plural: 'bebyggelser',
    singularSpecific: 'bebyggelsen',
    prefix: 'bebyggelses',
    fields: [{
      name: 'id',
      type: 'string',
      description: 'Unik identifikator for bebyggelsen.'
    },{
      name: 'kode',
      type: ['integer', 'null'],
      description: 'Unik kode for bebyggelsen.'
    }, {
      name: 'type',
      type: 'string',
      description: 'Angiver typen af bebyggelse.'
    }, {
      name: 'navn',
      type: 'string',
      description: 'Bebyggelsens navn.'
    }],
    filters: ['type', 'navn'],
    key: ['id'],
    geometryType: 'area',
    searchable: true
  }
};

Object.keys(module.exports).forEach(flatName => {
  registry.add(flatName, 'nameAndKey', undefined, module.exports[flatName]);
});
