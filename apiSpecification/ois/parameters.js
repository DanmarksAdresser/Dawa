"use strict";

const registry = require('../registry');

const filtersMap = {
  grund: [{
    name: 'id',
    field: 'Grund_id'
  }],
  bygning: [{
    name: 'id',
    field: 'Bygning_id'
  }, {
    name: 'adgangsadresseid',
    field: 'AdgAdr_id'
  }, {
    name: 'esrejendomsnr',
    field: 'ESREjdNr'
  }, {
    name: 'anvendelseskode',
    field: 'BYG_ANVEND_KODE'
  }, {
    name: 'kommunekode',
    field: 'KomKode'
  }],
  opgang: [{
    name: 'id',
    field: 'Opgang_id'
  }, {
    name: 'bygningsid',
    field: 'Bygning_id'
  }],
  enhed: [{
    name: 'id',
    field: 'Enhed_id'
  }, {
    name: 'adresseid',
    field: 'EnhAdr_id'
  }, {
    name: 'anvendelseskode',
    field: 'ENH_ANVEND_KODE'
  }, {
    name: 'bygningsid',
    field: 'bygning_Bygning_id'
  }, {
    name: 'kommunekode',
    field: 'bygning_KomKode'
  }],
  etage: [{
    name: 'id',
    field: 'Etage_id'
  }, {
    name: 'bygningsid',
    field: 'Bygning_id'
  }],
  tekniskanlaeg: [{
    name: 'id',
    field: 'Tekniskanlaeg_id'
  }, {
    name: 'adgangsadresseid',
    field: 'AdgAdr_id'
  }, {
    name: 'esrejendomsnr',
    field: 'ESREjdNr'
  }, {
    name: 'bygningsid',
    field: 'Bygning_id'
  }, {
    name: 'kommunekode',
    field: 'KomKode'
  }],
  ejerskab: [{
    name: 'id',
    field: 'Ejerskab_id'
  }, {
    name: 'bbrid',
    field: 'BbrId'
  }, {
    name: 'esrejendomsnr',
    field: 'ESREjdNr'
  }],
  bygningspunkt: [{
    name: 'id',
    field: 'BygPkt_id'
  }],
  matrikelreference: [{
    name: 'grundid',
    field: 'Grund_id'
  }, {
    name: 'ejerlavkode',
    field: 'LandsejerlavKode'
  }, {
    name: 'matrikelnr',
    field: 'MatrNr'
  }]
};

const filterParams = oisApiModelName => {
  const filters = filtersMap[oisApiModelName];
  return filters.map(filter => {
    return {
      name: filter.name,
      renameTo: filter.field
    }
  });
};

for(let oisApiModelName of Object.keys(filtersMap)) {
  exports[oisApiModelName] = {
    propertyFilter: filterParams(oisApiModelName)
  };
  registry.addMultiple(oisApiModelName, 'parameterGroup', module.exports[oisApiModelName]);
}
