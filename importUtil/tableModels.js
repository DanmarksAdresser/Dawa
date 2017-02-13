"use strict";

module.exports = {
  ejerlav: {
    primaryKey: ['kode'],
    columns: [{
      name: 'kode'
    }, {
      name: 'navn'
    }, {
      name: 'tsv',
      publicHistory: false
    }]
  },

  adgangsadresser: {
    primaryKey: ['id'],
    regularColumns: [{
      name: 'id'
    }, {
      name: 'kommunekode'
    }, {
      name: 'vejkode'
    }, {
      name: 'etrs89oest'
    }, {
      name: 'etrs89nord'
    }, {
      name: 'geom',
      publicHistory: false
    }, {
      name: 'tsv',
      publicHistory: false
    }]
  }
};
