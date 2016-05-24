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
      type: 'string',
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
    key: ['kode'],
    geometryType: 'area',
    searchable: true
  }
};
